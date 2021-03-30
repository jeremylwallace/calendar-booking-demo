
let token = ''
let user

if (document.cookie) {
    token = document.cookie
        .split('; ')
        .find(cookie => cookie.startsWith('token='))
        .split('=')[1];

    user = JSON.parse(atob(token.split('.')[1]))
    console.log(user)
}


if (!token) {
    window.location.href = '/login'
}

const getFreeTimes = async (day, durationInMinutes = 30) => {
    
    const response = await fetch(`/api/users/${user.email}/freetime?day=${day}&durationInMinutes=${durationInMinutes}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return response.json();
}