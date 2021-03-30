const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {

    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]
    
        jwt.verify(token, 'secret', (err, decoded) => {
            if (err) {
                console.log(err)
                res.redirect('/login')
            } else {
                req.user = decoded
                next()
            }
        })    
    } else {
        res.redirect('/login')
    }
}