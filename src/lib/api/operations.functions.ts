import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bookInputSchema,
  homeworkInputSchema,
  inventoryInputSchema,
  routeInputSchema,
  staffInputSchema,
  timetableInputSchema,
  uuidSchema,
} from "@/lib/validation/schemas";
import type {
  BookDTO,
  HomeworkDTO,
  InventoryItemDTO,
  LoanDTO,
  PayrollEntryDTO,
  StaffDTO,
  TimetableSlotDTO,
  TransportRouteDTO,
} from "@/lib/api/types";

/**
 * Server boundary for the operational modules: staff, timetable, homework,
 * library, inventory, transport and payroll. Same rules as the academic
 * boundary — authenticated, validated, DTOs only.
 */

const idInput = (input: unknown) => ({ id: uuidSchema.parse((input as { id: string })?.id) });

/* --------------------------------- Staff -------------------------------- */

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffDTO[]> => {
    const { data, error } = await context.supabase
      .from("staff")
      .select(
        "id, staff_no, full_name, job_title, department, subject, phone, email, status, monthly_salary, hired_on",
      )
      .order("staff_no");
    if (error) throw new Error(`Unable to load staff: ${error.message}`);
    return (data ?? []).map((s) => ({
      id: s.id,
      staffNo: s.staff_no,
      fullName: s.full_name,
      jobTitle: s.job_title,
      department: s.department,
      subject: s.subject,
      phone: s.phone,
      email: s.email,
      status: s.status,
      monthlySalary: Number(s.monthly_salary),
      hiredOn: s.hired_on,
    }));
  });

export const saveStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { id?: string };
    return { id: value.id, ...staffInputSchema.parse(input) };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      staff_no: data.staffNo,
      full_name: data.fullName,
      job_title: data.jobTitle,
      department: data.department,
      subject: data.subject || null,
      phone: data.phone,
      email: data.email || null,
      status: data.status,
      monthly_salary: data.monthlySalary,
      ...(data.hiredOn ? { hired_on: data.hiredOn } : {}),
    };

    const query = data.id
      ? context.supabase.from("staff").update(row).eq("id", data.id).select("id").single()
      : context.supabase.from("staff").insert(row).select("id").single();

    const { data: saved, error } = await query;
    if (error) {
      throw new Error(
        error.code === "23505"
          ? "That staff number is already in use."
          : `Unable to save the staff record: ${error.message}`,
      );
    }
    return { id: saved.id };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the staff record: ${error.message}`);
    return { id: data.id };
  });

/* ------------------------------- Timetable ------------------------------ */

export const listTimetable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    classLevel: String((input as { classLevel?: string })?.classLevel ?? ""),
  }))
  .handler(async ({ data, context }): Promise<TimetableSlotDTO[]> => {
    let query = context.supabase
      .from("timetable_slots")
      .select(
        "id, day_of_week, period, starts_at, ends_at, class_level, room, subjects(name), staff(full_name)",
      )
      .order("period");
    if (data.classLevel) query = query.eq("class_level", data.classLevel);

    const { data: rows, error } = await query;
    if (error) throw new Error(`Unable to load the timetable: ${error.message}`);

    return (rows ?? []).map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      period: r.period,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      classLevel: r.class_level,
      subjectName: (r.subjects as unknown as { name: string } | null)?.name ?? null,
      staffName: (r.staff as unknown as { full_name: string } | null)?.full_name ?? null,
      room: r.room,
    }));
  });

export const saveTimetableSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { id?: string };
    return { id: value.id, ...timetableInputSchema.parse(input) };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      day_of_week: data.dayOfWeek,
      period: data.period,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      class_level: data.classLevel,
      subject_id: data.subjectId || null,
      staff_id: data.staffId || null,
      room: data.room || null,
    };
    const query = data.id
      ? context.supabase
          .from("timetable_slots")
          .update(row)
          .eq("id", data.id)
          .select("id")
          .single()
      : context.supabase.from("timetable_slots").insert(row).select("id").single();

    const { data: saved, error } = await query;
    if (error) {
      throw new Error(
        error.code === "23505"
          ? "That class already has a lesson in this period."
          : `Unable to save the lesson: ${error.message}`,
      );
    }
    return { id: saved.id };
  });

export const deleteTimetableSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("timetable_slots").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the lesson: ${error.message}`);
    return { id: data.id };
  });

/* -------------------------------- Homework ------------------------------ */

export const listHomework = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomeworkDTO[]> => {
    const { data, error } = await context.supabase
      .from("homework")
      .select(
        "id, title, class_level, description, assigned_on, due_on, status, subjects(name)",
      )
      .order("due_on", { ascending: false });
    if (error) throw new Error(`Unable to load homework: ${error.message}`);

    return (data ?? []).map((h) => ({
      id: h.id,
      title: h.title,
      classLevel: h.class_level,
      subjectName: (h.subjects as unknown as { name: string } | null)?.name ?? null,
      description: h.description,
      assignedOn: h.assigned_on,
      dueOn: h.due_on,
      status: h.status,
    }));
  });

export const saveHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { id?: string };
    return { id: value.id, ...homeworkInputSchema.parse(input) };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      title: data.title,
      class_level: data.classLevel,
      subject_id: data.subjectId || null,
      description: data.description,
      assigned_on: data.assignedOn,
      due_on: data.dueOn,
      status: data.status,
      created_by: context.userId,
    };
    const query = data.id
      ? context.supabase.from("homework").update(row).eq("id", data.id).select("id").single()
      : context.supabase.from("homework").insert(row).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw new Error(`Unable to save the homework: ${error.message}`);
    return { id: saved.id };
  });

export const deleteHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("homework").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the homework: ${error.message}`);
    return { id: data.id };
  });

/* -------------------------------- Library ------------------------------- */

export const listBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookDTO[]> => {
    const { data, error } = await context.supabase
      .from("library_books")
      .select("id, title, author, category, isbn, total_copies, available_copies")
      .order("title");
    if (error) throw new Error(`Unable to load the catalogue: ${error.message}`);
    return (data ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      isbn: b.isbn,
      totalCopies: b.total_copies,
      availableCopies: b.available_copies,
    }));
  });

export const saveBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { id?: string };
    return { id: value.id, ...bookInputSchema.parse(input) };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      title: data.title,
      author: data.author,
      category: data.category,
      isbn: data.isbn || null,
      total_copies: data.totalCopies,
      available_copies: Math.min(data.availableCopies, data.totalCopies),
    };
    const query = data.id
      ? context.supabase.from("library_books").update(row).eq("id", data.id).select("id").single()
      : context.supabase.from("library_books").insert(row).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw new Error(`Unable to save the book: ${error.message}`);
    return { id: saved.id };
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("library_books").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the book: ${error.message}`);
    return { id: data.id };
  });

export const listLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LoanDTO[]> => {
    const { data, error } = await context.supabase
      .from("library_loans")
      .select("id, borrower_name, borrowed_on, due_on, returned_on, library_books(title)")
      .order("due_on");
    if (error) throw new Error(`Unable to load lending records: ${error.message}`);
    const today = new Date().toISOString().slice(0, 10);
    return (data ?? []).map((l) => ({
      id: l.id,
      bookTitle: (l.library_books as unknown as { title: string } | null)?.title ?? "—",
      borrowerName: l.borrower_name,
      borrowedOn: l.borrowed_on,
      dueOn: l.due_on,
      returnedOn: l.returned_on,
      overdue: !l.returned_on && l.due_on < today,
    }));
  });

export const issueBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { bookId?: string; borrowerName?: string; dueOn?: string };
    return {
      bookId: uuidSchema.parse(value.bookId),
      borrowerName: String(value.borrowerName ?? "").trim().slice(0, 120),
      dueOn: String(value.dueOn ?? ""),
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    if (data.borrowerName.length < 2) throw new Error("Enter the borrower's name.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dueOn)) throw new Error("Choose a return date.");

    const { data: book, error: bookError } = await context.supabase
      .from("library_books")
      .select("available_copies")
      .eq("id", data.bookId)
      .maybeSingle();
    if (bookError) throw new Error(bookError.message);
    if (!book || book.available_copies < 1) throw new Error("No copies of that title are available.");

    const { data: loan, error } = await context.supabase
      .from("library_loans")
      .insert({ book_id: data.bookId, borrower_name: data.borrowerName, due_on: data.dueOn })
      .select("id")
      .single();
    if (error) throw new Error(`Unable to issue the book: ${error.message}`);

    await context.supabase
      .from("library_books")
      .update({ available_copies: book.available_copies - 1 })
      .eq("id", data.bookId);

    return { id: loan.id };
  });

export const returnBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { data: loan, error } = await context.supabase
      .from("library_loans")
      .update({ returned_on: new Date().toISOString().slice(0, 10) })
      .eq("id", data.id)
      .is("returned_on", null)
      .select("book_id")
      .maybeSingle();
    if (error) throw new Error(`Unable to record the return: ${error.message}`);
    if (!loan) throw new Error("That loan has already been returned.");

    const { data: book } = await context.supabase
      .from("library_books")
      .select("available_copies, total_copies")
      .eq("id", loan.book_id)
      .maybeSingle();
    if (book) {
      await context.supabase
        .from("library_books")
        .update({ available_copies: Math.min(book.total_copies, book.available_copies + 1) })
        .eq("id", loan.book_id);
    }
    return { id: data.id };
  });

/* ------------------------------- Inventory ------------------------------ */

export const listInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InventoryItemDTO[]> => {
    const { data, error } = await context.supabase
      .from("inventory_items")
      .select("id, name, category, quantity, unit_cost, location, condition")
      .order("name");
    if (error) throw new Error(`Unable to load inventory: ${error.message}`);
    return (data ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unitCost: Number(i.unit_cost),
      location: i.location,
      condition: i.condition,
    }));
  });

export const saveInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { id?: string };
    return { id: value.id, ...inventoryInputSchema.parse(input) };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit_cost: data.unitCost,
      location: data.location,
      condition: data.condition,
    };
    const query = data.id
      ? context.supabase.from("inventory_items").update(row).eq("id", data.id).select("id").single()
      : context.supabase.from("inventory_items").insert(row).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(`Unable to save the item: ${error.message}`);
    return { id: saved.id };
  });

export const deleteInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("inventory_items").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the item: ${error.message}`);
    return { id: data.id };
  });

/* ------------------------------- Transport ------------------------------ */

export const listRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TransportRouteDTO[]> => {
    const { data, error } = await context.supabase
      .from("transport_routes")
      .select("id, name, vehicle_reg, driver_name, driver_phone, capacity, learners, status")
      .order("name");
    if (error) throw new Error(`Unable to load transport routes: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      vehicleReg: r.vehicle_reg,
      driverName: r.driver_name,
      driverPhone: r.driver_phone,
      capacity: r.capacity,
      learners: r.learners,
      status: r.status,
    }));
  });

export const saveRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { id?: string };
    return { id: value.id, ...routeInputSchema.parse(input) };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      name: data.name,
      vehicle_reg: data.vehicleReg,
      driver_name: data.driverName,
      driver_phone: data.driverPhone,
      capacity: data.capacity,
      learners: data.learners,
      status: data.status,
    };
    const query = data.id
      ? context.supabase.from("transport_routes").update(row).eq("id", data.id).select("id").single()
      : context.supabase.from("transport_routes").insert(row).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(`Unable to save the route: ${error.message}`);
    return { id: saved.id };
  });

export const deleteRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("transport_routes").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the route: ${error.message}`);
    return { id: data.id };
  });

/* -------------------------------- Payroll ------------------------------- */

export const listPayroll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    period: String((input as { period?: string })?.period ?? "").slice(0, 7),
  }))
  .handler(async ({ data, context }): Promise<PayrollEntryDTO[]> => {
    let query = context.supabase
      .from("payroll_entries")
      .select(
        "id, period, gross_pay, ssnit, income_tax, net_pay, status, staff(full_name, staff_no)",
      )
      .order("period", { ascending: false });
    if (data.period) query = query.eq("period", data.period);

    const { data: rows, error } = await query;
    if (error) throw new Error(`Unable to load payroll: ${error.message}`);

    return (rows ?? []).map((p) => {
      const staff = p.staff as unknown as { full_name: string; staff_no: string } | null;
      return {
        id: p.id,
        staffName: staff?.full_name ?? "—",
        staffNo: staff?.staff_no ?? "—",
        period: p.period,
        grossPay: Number(p.gross_pay),
        ssnit: Number(p.ssnit),
        incomeTax: Number(p.income_tax),
        netPay: Number(p.net_pay),
        status: p.status,
      };
    });
  });

/** Generates (or refreshes) the payroll run for a month from staff salaries. */
export const runPayroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const period = String((input as { period?: string })?.period ?? "");
    if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Choose a payroll month.");
    return { period };
  })
  .handler(async ({ data, context }): Promise<{ processed: number }> => {
    const { data: staff, error } = await context.supabase
      .from("staff")
      .select("id, monthly_salary")
      .eq("status", "Active");
    if (error) throw new Error(`Unable to read staff salaries: ${error.message}`);

    const rows = (staff ?? []).map((s) => {
      const gross = Number(s.monthly_salary);
      const ssnit = Math.round(gross * 0.055 * 100) / 100;
      const tax = Math.round(gross * 0.125 * 100) / 100;
      return {
        staff_id: s.id,
        period: data.period,
        gross_pay: gross,
        ssnit,
        income_tax: tax,
        net_pay: Math.round((gross - ssnit - tax) * 100) / 100,
        status: "Pending",
      };
    });
    if (rows.length === 0) return { processed: 0 };

    const { error: upsertError } = await context.supabase
      .from("payroll_entries")
      .upsert(rows, { onConflict: "staff_id,period" });
    if (upsertError) throw new Error(`Unable to run payroll: ${upsertError.message}`);

    return { processed: rows.length };
  });

export const markPayrollPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    period: String((input as { period?: string })?.period ?? "").slice(0, 7),
  }))
  .handler(async ({ data, context }): Promise<{ period: string }> => {
    const { error } = await context.supabase
      .from("payroll_entries")
      .update({ status: "Paid" })
      .eq("period", data.period);
    if (error) throw new Error(`Unable to update payroll: ${error.message}`);
    return { period: data.period };
  });
