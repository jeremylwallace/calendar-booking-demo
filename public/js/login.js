(() => {
    let loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        document.getElementById('error-message').classList.add("d-none")
        submitRegisterForm()
    })
})()

const submitRegisterForm = async () => {
    let email = document.getElementById('email-field').value;
    let password = document.getElementById('password-field').value;
    
    let errorMessage = document.getElementById('error-message')

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data)
        if (data.status === 'success') {
            document.cookie = `token=${data.token}`
            window.location.href = '/'
        } else {
            errorMessage.classList.remove("d-none");
        }
    })
    .catch(err => {
        console.log('error', err)
    })
}