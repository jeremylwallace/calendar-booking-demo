
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

const getMyEvents = async () => {
    console.log(user)
    const response = await fetch(`/api/users/${user.email}/events`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return response.json();
}