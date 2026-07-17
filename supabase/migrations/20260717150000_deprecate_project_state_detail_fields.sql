-- =========================================================
-- Deprecate (but keep) the project_state detail fields
--
-- The effective project model is now just: name, one-line summary, owner,
-- current_state, waiting_on, and last_verified_at. The separate structured
-- state fields below are no longer displayed, injected into Chief's context,
-- or written through ordinary AI proposals — anything that still matters is
-- folded into current_state as prose, and freshness is the verified date
-- (last_verified_at), not a manual confidence label.
--
-- These columns are DEPRECATED but intentionally NOT dropped: existing values
-- stay in the database for backward compatibility. This migration only records
-- the deprecation via column comments.
-- =========================================================

comment on column public.project_state.open_loops is
  'DEPRECATED: no longer displayed, sent to Chief, or written via proposals. Fold into current_state. Retained for backward compatibility.';
comment on column public.project_state.blockers is
  'DEPRECATED: no longer displayed, sent to Chief, or written via proposals. Fold into current_state. Retained for backward compatibility.';
comment on column public.project_state.decisions is
  'DEPRECATED: no longer displayed, sent to Chief, or written via proposals. Fold into current_state. Retained for backward compatibility.';
comment on column public.project_state.recent_changes is
  'DEPRECATED: no longer displayed, sent to Chief, or written via proposals. Fold into current_state. Retained for backward compatibility.';
comment on column public.project_state.confidence is
  'DEPRECATED: freshness is now represented by last_verified_at, not a manual confidence label. Retained for backward compatibility.';
