module.exports = (req, res) => {
    res.json({ 
        message: 'API Test Working!', 
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    });
};
