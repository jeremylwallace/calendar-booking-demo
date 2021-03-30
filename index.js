const http = require('http');
const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken')

const ds = require('./utils/data-service');
const authCheck = require('./utils/auth-check');
const rootPath = require('./utils/root-path');

const PORT = 3000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())

app.get('/api/events', authCheck, async (req, res) => {
    const events = await ds.getEvents();
    res.json(events);
})

app.post('/api/events', authCheck, async (req, res) => {
    try {
        const eventAdded = await ds.addEvent(req.body);
        res.json(eventAdded);
    } catch (ex) {
        res.status(ex.status || 500).json(ex)
    }
})

app.get('/api/events/:id', authCheck, async (req, res) => {
    try {
        const event = await ds.getEvent(req.params.id);
        res.json(event);    
    } catch (err) {
        res.status(err.status || 500).json({});
    }
})

app.delete('/api/events/:id', authCheck, async (req, res) => {
    const response = await ds.deleteEvent(req.params.id);
    res.json(response);
})

app.get('/api/users/:email/events', authCheck, async (req, res) => {
    try {
        const events = await ds.getUsersEvents(req.params.email, req.query.includePast);
        res.json(events);    
    } catch (err) {
        res.status(err.status || 500).json([]);
    }
})

app.get('/api/users/:email/freetime', async (req, res) => {
    const email = req.params.email
    const day = req.query.day
    const durationInMinutes = req.query.durationInMinutes;

    try {
        const freeTime = await ds.getFreeTime(email, day, durationInMinutes)
        res.json(freeTime);    
    } catch (err) {
        res.status(500).json(err)
    }
})

app.get('/login', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'))
})

app.post('/login', async (req, res) => {
    try {
        const user = await ds.getUserByEmailAndPassword(req.body.email, req.body.password)
        const token = jwt.sign(user, 'secret', { expiresIn: '1d' })
        console.log(token)
        res.json({ status: 'success', token})
    } catch (err) {
        res.status(401).json(err)
    }
})

app.get('/register', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'))
})

app.post('/register', async (req, res) => {
    try {
        const user = await ds.addUser(req.body.email, req.body.password, req.body.name)
        const token = jwt.sign(user, 'secret', { expiresIn: '1d' })
        res.json({ status: 'success', token})
    } catch (err) {
        res.status(500).json({ status: 'failed', error: err })
    }
})

app.get('/book/:email', (req, res) => {
    res.sendFile(path.join(rootPath, 'public', 'booking.html'))
})

app.listen(PORT, () => {
    console.log('server listening on', PORT);
})