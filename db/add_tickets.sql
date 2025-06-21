-- 티켓 추가 함수
CREATE OR REPLACE FUNCTION add_tickets(user_id_param UUID, ticket_count_param INTEGER)
RETURNS VOID AS $$
BEGIN
  -- 사용자 티켓 업데이트
  UPDATE user_tickets
  SET remaining_tickets = remaining_tickets + ticket_count_param
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
