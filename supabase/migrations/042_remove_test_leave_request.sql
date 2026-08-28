-- Remove the test leave request identified in GitHub issue #5.
DELETE FROM public.leave_requests
WHERE id = '5aeb4493-1c44-48f7-a81a-8bb855c58772'::uuid;
