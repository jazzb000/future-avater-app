-- Function to use a ticket
CREATE OR REPLACE FUNCTION use_ticket(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_tickets 
  SET remaining_tickets = remaining_tickets - 1,
      updated_at = NOW()
  WHERE user_id = user_id_param AND remaining_tickets > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tickets available for user';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add tickets
CREATE OR REPLACE FUNCTION add_tickets(user_id_param UUID, ticket_count_param INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has tickets
  IF EXISTS (SELECT 1 FROM user_tickets WHERE user_id = user_id_param) THEN
    -- Update existing record
    UPDATE user_tickets
    SET 
      remaining_tickets = remaining_tickets + ticket_count_param,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = user_id_param;
  ELSE
    -- Create new record
    INSERT INTO user_tickets (user_id, remaining_tickets)
    VALUES (user_id_param, ticket_count_param);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment image view count
CREATE OR REPLACE FUNCTION increment_image_view(image_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO image_views (image_id, view_count)
  VALUES (image_id_param, 1)
  ON CONFLICT (image_id)
  DO UPDATE SET 
    view_count = image_views.view_count + 1,
    last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment doodle view count
CREATE OR REPLACE FUNCTION increment_doodle_view(doodle_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO doodle_views (doodle_id, view_count)
  VALUES (doodle_id_param, 1)
  ON CONFLICT (doodle_id)
  DO UPDATE SET 
    view_count = doodle_views.view_count + 1,
    last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund a ticket
CREATE OR REPLACE FUNCTION refund_ticket(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_tickets 
  SET remaining_tickets = remaining_tickets + 1,
      updated_at = NOW()
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    -- If user doesn't exist, create a new record with 1 ticket
    INSERT INTO user_tickets (user_id, remaining_tickets, created_at, updated_at)
    VALUES (user_id_param, 1, NOW(), NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_images', COALESCE(COUNT(gi.id), 0),
    'completed_images', COALESCE(SUM(CASE WHEN gi.status = 'completed' THEN 1 ELSE 0 END), 0),
    'remaining_tickets', COALESCE(ut.remaining_tickets, 0)
  )
  INTO result
  FROM user_tickets ut
  LEFT JOIN generated_images gi ON gi.user_id = ut.user_id
  WHERE ut.user_id = user_id_param
  GROUP BY ut.remaining_tickets;
  
  RETURN COALESCE(result, '{"total_images": 0, "completed_images": 0, "remaining_tickets": 0}'::json);
END;
$$ LANGUAGE plpgsql;
