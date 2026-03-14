function initForms() {
  const forms = document.querySelectorAll('form[data-form]');
  forms.forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
    
    // Configurar intl-tel-input se houver input type="tel"
    const telInput = form.querySelector('input[type="tel"]');
    if (telInput) {
      window.intlTelInput(telInput, {
        initialCountry: "br",
        preferredCountries: ["br", "pt", "us"],
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.10/build/js/utils.js",
        strictMode: true,
      });
    }
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const feedback = form.querySelector('.form-feedback');

  // Validação
  let isValid = true;
  const requiredFields = form.querySelectorAll('[required]');

  requiredFields.forEach(field => {
    field.classList.remove('error');
    if (!field.value.trim()) {
      field.classList.add('error');
      isValid = false;
    }
    if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        field.classList.add('error');
        isValid = false;
      }
    }
  });

  if (!isValid) {
    if (feedback) {
      feedback.textContent = 'Preencha todos os campos corretamente.';
      feedback.classList.add('error');
      feedback.classList.remove('success');
    }
    return;
  }

  // Loading state
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'ENVIANDO...';

  try {
    const formData = new FormData(form);

    const response = await fetch(form.getAttribute('action') || window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    });

    if (response.ok) {
      // Redirect para página de obrigado
      const action = form.getAttribute('action');
      if (action) {
        window.location.href = action;
        return;
      }

      // Fallback
      if (feedback) {
        feedback.textContent = 'Enviado com sucesso!';
        feedback.classList.add('success');
        feedback.classList.remove('error');
      }
      form.reset();
    } else {
      throw new Error('Erro no envio');
    }
  } catch (error) {
    console.error('Form error:', error);
    if (feedback) {
      feedback.textContent = 'Erro ao enviar. Tente novamente.';
      feedback.classList.add('error');
      feedback.classList.remove('success');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Config AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50,
      disableMutationObserver: true // Important to avoid CLS
    });
  }

  initForms();
});
