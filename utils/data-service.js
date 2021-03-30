const fs = require('fs')
const path = require('path')

const bcrypt = require('bcrypt')
const { DateTime } = require("luxon");

const rootPath = require('./root-path');

const getEvents = () => {

    return new Promise((resolve, reject) => {
        fs.readFile(path.join(rootPath, 'data', 'events.json'), (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                const events = JSON.parse(data);
                resolve(events);
            }
        })    
    })

}

const getEvent = (eventId) => {
    return new Promise((resolve, reject) => {
        getEvents().then(events => {
            const single = events.find(ev => ev.id == eventId);
            if (single) {
                resolve(single);     
            } else {
                reject({ status: 404, message: 'event not found' })
            }
        }).catch(err => {
            reject(err);
        })
    })
}

const getUsersEvents = (email, includePast = false) => {
    
    const userPromise = getUserByEmail(email);

    return new Promise((resolve, reject) => {
        getEvents().then(async (events) => {
            const user = await userPromise;
            if (user) {
                const usersEvents = events.filter(ev => ev.owner == user.id);
                if (includePast == 'true' ) {
                    resolve(usersEvents);
                } else {
                    const futureOnly = usersEvents.filter(ev => DateTime.fromISO(ev.startTime) > DateTime.now())
                    resolve(futureOnly)
                }    
            } else {        // no user found
                reject({ status: 404 })
            }
                 
        }).catch(err => {
            reject(err);
        })
    })

}

const addEvent = (eventData) => {

    return new Promise((resolve, reject) => {
        getEvents().then(events => {

            const newEvent = {
                id: Math.max.apply(Math,events.map(function(e){return e.id;})) + 1, // this will reuse old ids...
                owner: eventData.owner,
                description: eventData.description,
                startTime: DateTime.fromISO(eventData.startTime),
                endTime: DateTime.fromISO(eventData.startTime).plus({ minutes: eventData.durationInMinutes }),
                timeZone: eventData.timeZone,
                attendees: [...eventData.attendees],
                status: eventData.status
            }

            checkFreeBusy(newEvent.owner, newEvent.startTime, newEvent.endTime)
                .then(freebusy => {
                    if (freebusy === 'free') {
                        events.push(newEvent);
        
                        fs.writeFile(path.join(rootPath, 'data', 'events.json'), JSON.stringify(events), (err) => {
                            if (err) {
                                reject(err)
                            } else {
                                resolve(newEvent)
                            }
                        })            
                    } else {    // busy
                        reject({ message: 'time is not available', status: 200 })
                    }
                })
        
    
        }).catch(e => {
            reject({e, status: 500});
        });

    });

}

const deleteEvent = (eventId) => {

    return new Promise((resolve, reject) => {
        getEvents().then(events => {
            const remainingEvents = events.filter(ev => ev.id != eventId);
            fs.writeFile(path.join(rootPath, 'data', 'events.json'), JSON.stringify(remainingEvents), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve({ status: "sucess" })
                }
            })

        }).catch(err => {
            reject(err);
        })
    })

}

const checkFreeBusy = (ownerId, meetingStart, meetingEnd) => {
    
    return new Promise((resolve, reject) => {

        getUsersEvents(ownerId).then(events => {
            const conflicts = events.filter(event => {
            
                const eventStart = DateTime.fromISO(event.startTime)
                const eventEnd = DateTime.fromISO(event.endTime)
    
                return (meetingStart >= eventStart && meetingStart < eventEnd) ||
                       (eventStart >= meetingStart && eventStart < meetingEnd)
    
            })
    
            if (conflicts.length > 0) {
                resolve('busy')
            } else {
                resolve('free')
            }
    
        }).catch(err => {
            reject(err)
        })
    })
}

const getFreeTime = (email, day, durationInMinutes) => {

    return new Promise(async (resolve, reject) => {
        try {
        const userPromise = getUserByEmail(email)
        const events = await getUsersEvents(email);

        const eventsForDay = events.filter(event => DateTime.fromISO(event.startTime) > DateTime.fromISO(day) && DateTime.fromISO(event.endTime) < DateTime.fromISO(day).plus({ day: 1 }))

        const meetingTimesPossible = []
        const meetingTimesAvailable = []

        const user = await userPromise;
        const firstMeetingTimeStart = DateTime.fromISO(`${day}T${user.firstAvailableTime}`)
        const lastMeetingTimeEnd = DateTime.fromISO(`${day}T${user.lastAvailableTime}`)

        let testTime = DateTime.fromISO(firstMeetingTimeStart)

        while (testTime < lastMeetingTimeEnd && testTime >= DateTime.now()) {

            meetingTimesPossible.push(testTime)

            testTime = testTime.plus({ minutes: durationInMinutes })
        }

        meetingTimesPossible.forEach((time) => {

            const matches = eventsForDay.filter((event) => {

                const eventStart = DateTime.fromISO(event.startTime)
                const eventEnd = DateTime.fromISO(event.endTime)

                return (time >= eventStart && time < eventEnd) ||
                (eventStart >= time && eventStart < time.plus({ minutes: durationInMinutes })) ||
                (time < eventEnd && time >= eventStart)

            })
            
            if (matches.length === 0) {
                meetingTimesAvailable.push(time.toISO())
            }
        })

        resolve(meetingTimesAvailable)
        } catch (ex) {
            console.log(ex)
        }

    })


}

const addUser = async (email, pw, name) => {
    return new Promise((resolve, reject) => {

        fs.readFile(path.join(rootPath, 'data', 'users.json'), (err, data) => {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                const users = JSON.parse(data)
                
                const existing = users.find(u => u.email === email)

                if (existing) {
                    reject({ message: 'email already in use' })
                } else {
                    bcrypt.hash(pw, 12)
                        .then(hashed => {
                            const newUser = {
                                id: users.length + 1, 
                                name, 
                                email, 
                                password: hashed
                            }
                            users.push(newUser)
                            fs.writeFile(path.join(rootPath, 'data', 'users.json'), JSON.stringify(users), (err) => {
                                if (err) {
                                    reject(err)
                                } else {
                                    delete newUser.password
                                    resolve(newUser)
                                }
                            })
                        })
                }
            }
        })
    
    })
}

const getUserByEmail = async (email) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(rootPath, 'data', 'users.json'), (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                const users = JSON.parse(data);
                const user = users.find(u => u.email === email);
                resolve(user);
            }
        })    
    })
}

const getUserByEmailAndPassword = async (email, pw) => {
    return new Promise(async (resolve, reject) => {
        const user = await getUserByEmail(email)
        if (user) {
            if (await bcrypt.compare(pw, user.password)) {
                delete user.password;
                resolve(user)
            }
        }
        reject({ message: 'email or password not found' })
    })
}

module.exports = {
    getEvents,
    getUsersEvents,
    addEvent,
    deleteEvent,
    getEvent,
    getFreeTime,
    getUserByEmailAndPassword,
    addUser
}