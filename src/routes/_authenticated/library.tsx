import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatCards } from "@/components/DataTable";
import {
  listBooks,
  listLoans,
  saveBook,
  issueBook,
  returnBook,
} from "@/lib/api/operations.functions";
import { formatDate } from "@/lib/domain/grading";
import { useAuth } from "@/lib/auth-context";
import type { BookDTO, LoanDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library | EduMaster" },
      {
        name: "description",
        content: "Library catalogue, copies available, lending records and overdue returns.",
      },
      { property: "og:title", content: "Library | EduMaster" },
      { property: "og:description", content: "Catalogue, lending and overdue returns." },
    ],
  }),
  component: LibraryPage,
});

function inTwoWeeks() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function LibraryPage() {
  const { isAdmin, hasRole } = useAuth();
  const canWrite = isAdmin || hasRole("librarian");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [book, setBook] = useState({ title: "", author: "", category: "General", copies: "1" });
  const [loan, setLoan] = useState({ bookId: "", borrowerName: "", dueOn: inTwoWeeks() });

  const books = useQuery({ queryKey: ["books"], queryFn: () => listBooks() });
  const loans = useQuery({ queryKey: ["loans"], queryFn: () => listLoans() });

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return books.data ?? [];
    return (books.data ?? []).filter((b) =>
      [b.title, b.author, b.category].some((v) => v.toLowerCase().includes(term)),
    );
  }, [books.data, search]);

  const addBook = useMutation({
    mutationFn: () =>
      saveBook({
        data: {
          title: book.title,
          author: book.author,
          category: book.category,
          isbn: "",
          totalCopies: Number(book.copies) || 1,
          availableCopies: Number(book.copies) || 1,
        },
      }),
    onSuccess: () => {
      toast.success("Title added to the catalogue");
      setBookOpen(false);
      setBook({ title: "", author: "", category: "General", copies: "1" });
      void queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issue = useMutation({
    mutationFn: () => issueBook({ data: loan }),
    onSuccess: () => {
      toast.success("Book issued");
      setIssueOpen(false);
      setLoan({ bookId: "", borrowerName: "", dueOn: inTwoWeeks() });
      void queryClient.invalidateQueries({ queryKey: ["books"] });
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const giveBack = useMutation({
    mutationFn: (id: string) => returnBook({ data: { id } }),
    onSuccess: () => {
      toast.success("Return recorded");
      void queryClient.invalidateQueries({ queryKey: ["books"] });
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = books.data ?? [];
    const out = (loans.data ?? []).filter((l) => !l.returnedOn);
    return [
      { label: "Titles", value: String(list.length) },
      {
        label: "Copies held",
        value: String(list.reduce((s, b) => s + b.totalCopies, 0)),
      },
      { label: "On loan", value: String(out.length) },
      { label: "Overdue", value: String(out.filter((l) => l.overdue).length) },
    ];
  }, [books.data, loans.data]);

  return (
    <AppLayout
      title="Library"
      subtitle="Catalogue, lending and overdue returns."
      actions={
        canWrite ? (
          <div className="flex gap-2">
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Issue book</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Issue a book</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Select
                      value={loan.bookId}
                      onValueChange={(v) => setLoan((l) => ({ ...l, bookId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a title" />
                      </SelectTrigger>
                      <SelectContent>
                        {(books.data ?? [])
                          .filter((b) => b.availableCopies > 0)
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.title} ({b.availableCopies} free)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="borrower">Borrower</Label>
                    <Input
                      id="borrower"
                      value={loan.borrowerName}
                      onChange={(e) => setLoan((l) => ({ ...l, borrowerName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="due">Return by</Label>
                    <Input
                      id="due"
                      type="date"
                      value={loan.dueOn}
                      onChange={(e) => setLoan((l) => ({ ...l, dueOn: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => issue.mutate()}
                    disabled={issue.isPending || !loan.bookId || loan.borrowerName.length < 2}
                  >
                    {issue.isPending ? "Issuing…" : "Issue book"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={bookOpen} onOpenChange={setBookOpen}>
              <DialogTrigger asChild>
                <Button>Add title</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a title</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["title", "Title"],
                      ["author", "Author"],
                      ["category", "Category"],
                      ["copies", "Copies"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`b-${key}`}>{label}</Label>
                      <Input
                        id={`b-${key}`}
                        value={book[key]}
                        onChange={(e) => setBook((b) => ({ ...b, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => addBook.mutate()}
                    disabled={addBook.isPending || book.title.trim().length < 2}
                  >
                    {addBook.isPending ? "Saving…" : "Add title"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null
      }
    >
      <StatCards stats={stats} />
      <Card>
        <CardContent className="p-5">
          <Tabs defaultValue="catalogue">
            <TabsList className="mb-4">
              <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
              <TabsTrigger value="loans">Lending</TabsTrigger>
            </TabsList>

            <TabsContent value="catalogue">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the catalogue…"
                className="mb-4 max-w-sm"
                aria-label="Search catalogue"
              />
              <DataTable<BookDTO>
                rows={filteredBooks}
                isLoading={books.isLoading}
                error={books.error}
                rowKey={(b) => b.id}
                emptyMessage="No titles match this search."
                columns={[
                  { key: "title", header: "Title", render: (b) => b.title },
                  { key: "author", header: "Author", render: (b) => b.author || "—" },
                  { key: "cat", header: "Category", render: (b) => b.category },
                  { key: "total", header: "Copies", render: (b) => b.totalCopies },
                  {
                    key: "free",
                    header: "Available",
                    render: (b) => (
                      <Badge variant={b.availableCopies > 0 ? "secondary" : "outline"}>
                        {b.availableCopies}
                      </Badge>
                    ),
                  },
                ]}
              />
            </TabsContent>

            <TabsContent value="loans">
              <DataTable<LoanDTO>
                rows={loans.data}
                isLoading={loans.isLoading}
                error={loans.error}
                rowKey={(l) => l.id}
                emptyMessage="No books are on loan."
                columns={[
                  { key: "book", header: "Title", render: (l) => l.bookTitle },
                  { key: "borrower", header: "Borrower", render: (l) => l.borrowerName },
                  { key: "out", header: "Borrowed", render: (l) => formatDate(l.borrowedOn) },
                  { key: "due", header: "Due", render: (l) => formatDate(l.dueOn) },
                  {
                    key: "status",
                    header: "Status",
                    render: (l) => (
                      <Badge
                        variant={
                          l.returnedOn ? "outline" : l.overdue ? "destructive" : "secondary"
                        }
                      >
                        {l.returnedOn ? "Returned" : l.overdue ? "Overdue" : "On loan"}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    header: "",
                    render: (l) =>
                      canWrite && !l.returnedOn ? (
                        <Button size="sm" variant="ghost" onClick={() => giveBack.mutate(l.id)}>
                          Mark returned
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
