CREATE OR REPLACE FUNCTION public.term_dashboard_stats(_term_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH t AS (SELECT id FROM public.terms WHERE code = _term_code),
  fees AS (
    SELECT COALESCE(SUM(amount), 0) AS collected
    FROM public.fee_payments WHERE term_id = (SELECT id FROM t)
  ),
  billed AS (
    SELECT COALESCE(SUM(fee_billed), 0) AS total,
           COUNT(*) AS learners,
           COUNT(*) FILTER (WHERE status = 'Active') AS active_learners
    FROM public.students
  ),
  ex AS (
    SELECT COUNT(*) AS exam_count FROM public.exams WHERE term_id = (SELECT id FROM t)
  ),
  sc AS (
    SELECT COALESCE(ROUND(AVG(m.score)::numeric, 1), 0) AS mean_score, COUNT(m.id) AS marks_count
    FROM public.marks m
    JOIN public.exams e ON e.id = m.exam_id
    WHERE e.term_id = (SELECT id FROM t)
  )
  SELECT jsonb_build_object(
    'learners', billed.learners,
    'activeLearners', billed.active_learners,
    'feesBilled', billed.total,
    'feesCollected', fees.collected,
    'feesOutstanding', GREATEST(billed.total - fees.collected, 0),
    'examCount', ex.exam_count,
    'marksCount', sc.marks_count,
    'meanScore', sc.mean_score
  )
  FROM billed, fees, ex, sc;
$$;

CREATE OR REPLACE FUNCTION public.term_grade_performance(_term_code text)
RETURNS TABLE (grade_level text, mean_score numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.grade_level, ROUND(AVG(m.score)::numeric, 1)
  FROM public.marks m
  JOIN public.exams e ON e.id = m.exam_id
  JOIN public.terms t ON t.id = e.term_id
  JOIN public.students s ON s.id = m.student_id
  WHERE t.code = _term_code
  GROUP BY s.grade_level;
$$;

REVOKE ALL ON FUNCTION public.term_dashboard_stats(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.term_grade_performance(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.term_dashboard_stats(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.term_grade_performance(text) TO authenticated, service_role;