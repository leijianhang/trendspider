import { authenticateHunterUser } from '../services/authService.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!String(username || '').trim() || !String(password || '')) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = await authenticateHunterUser({ username, password });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    return res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ success: false, error: 'Login service unavailable' });
  }
};
