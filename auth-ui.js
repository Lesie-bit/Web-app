(function () {
    const style = document.createElement('style')
    style.textContent = `
        .auth-overlay { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; background: rgba(10, 29, 51, .72); backdrop-filter: blur(7px); opacity: 0; transition: opacity .2s ease; }
        .auth-overlay.is-visible { opacity: 1; }
        .auth-overlay-card { width: min(calc(100% - 40px), 330px); padding: 32px 24px 28px; border-radius: 20px; background: #fff; text-align: center; box-shadow: 0 24px 70px rgba(0,0,0,.25); transform: translateY(10px) scale(.96); transition: transform .25s ease; }
        .auth-overlay.is-visible .auth-overlay-card { transform: translateY(0) scale(1); }
        .auth-overlay-icon { width: 66px; height: 66px; display: grid; place-items: center; margin: 0 auto 18px; border-radius: 50%; background: #e8f0f8; color: #1b3a6b; font-size: 1.8rem; }
        .auth-overlay-icon.is-logout { background: #fef3e2; color: #b57916; }
        .auth-overlay-spinner { width: 22px; height: 22px; margin: 12px auto 0; border: 3px solid #dce5ee; border-top-color: #1b3a6b; border-radius: 50%; animation: auth-spin .7s linear infinite; }
        .auth-toast { position: fixed; z-index: 2100; top: 24px; right: 24px; width: min(calc(100% - 48px), 360px); display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid #f0c9c9; border-left: 4px solid #b42318; border-radius: 12px; background: #fff; color: #5e2525; box-shadow: 0 12px 30px rgba(0,0,0,.14); opacity: 0; transform: translateY(-10px); transition: opacity .2s, transform .2s; }
        .auth-toast.is-visible { opacity: 1; transform: translateY(0); }
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @media (max-width: 575.98px) { .auth-toast { top: 14px; right: 14px; width: calc(100% - 28px); } }
    `
    document.head.appendChild(style)

    window.showAuthOverlay = function (message, redirectUrl, mode) {
        const isLogout = mode === 'logout'
        const overlay = document.createElement('div')
        overlay.className = 'auth-overlay'
        overlay.innerHTML = `<div class="auth-overlay-card" role="status" aria-live="polite">
            <div class="auth-overlay-icon ${isLogout ? 'is-logout' : ''}"><i class="bi ${isLogout ? 'bi-box-arrow-right' : 'bi-check-lg'}"></i></div>
            <h5 class="fw-bold mb-2">${message}</h5>
            <p class="text-muted small mb-0">กรุณารอสักครู่</p>
            <div class="auth-overlay-spinner"></div>
        </div>`
        document.body.appendChild(overlay)
        requestAnimationFrame(() => overlay.classList.add('is-visible'))
        window.setTimeout(() => { window.location.href = redirectUrl }, 700)
    }

    window.showAuthToast = function (message) {
        const toast = document.createElement('div')
        toast.className = 'auth-toast'
        toast.setAttribute('role', 'alert')
        toast.innerHTML = `<i class="bi bi-exclamation-circle-fill fs-5"></i><span>${message}</span>`
        document.body.appendChild(toast)
        requestAnimationFrame(() => toast.classList.add('is-visible'))
        window.setTimeout(() => {
            toast.classList.remove('is-visible')
            window.setTimeout(() => toast.remove(), 220)
        }, 3200)
    }
})()