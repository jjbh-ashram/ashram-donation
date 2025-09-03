export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password is required' 
      })
    }

    // Check password
    if (password === '7890') {
      // Generate a simple token (demo purposes)
      const token = `verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return res.status(200).json({
        success: true,
        token: token,
        message: 'Authentication successful'
      })
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      })
    }
  } catch (error) {
    console.error('Password verification error:', error)
    return res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}
