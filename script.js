document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const profileBadge = document.querySelector('.profile-badge[data-user-name]');
  if (profileBadge) {
    const fullName = profileBadge.dataset.userName.trim();
    const nameParts = fullName.split(/\s+/);
    if (nameParts.length < 2) {
      throw new Error('The profile name must include a first and last name.');
    }

    const profileName = profileBadge.querySelector('.profile-name');
    const profileAvatar = profileBadge.querySelector('.profile-avatar');
    const greetingName = document.getElementById('greeting-name');
    const sidebarContext = document.querySelector('.sidebar-context');

    if (profileName) {
      profileName.textContent = fullName;
    }
    if (profileAvatar) {
      profileAvatar.textContent = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
    }
    if (greetingName) {
      greetingName.textContent = nameParts.slice(0, 2).join(' ');
    }
    if (sidebarContext) {
      sidebarContext.textContent = `${fullName} · ${sidebarContext.textContent.trim()}`;
    }
  }

  /* ---------- Sidebar (collapsible on desktop, off-canvas drawer on mobile) ---------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.overlay');
  const mq = window.matchMedia('(min-width: 1024px)');
  const STORAGE_KEY = 'sidebarOpen';
  let isOpen = false;

  function readDesktopState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch (error) {
      console.warn('Unable to read the saved sidebar state.', error);
      return true;
    }
  }

  function saveDesktopState(open) {
    try {
      localStorage.setItem(STORAGE_KEY, String(open));
    } catch (error) {
      console.warn('Unable to save the sidebar state.', error);
    }
  }

  if (menuToggle && sidebar && overlay) {
    function setOpen(open, returnFocus = false) {
      isOpen = open;

      if (mq.matches) {
        sidebar.classList.remove('sidebar--open');
        overlay.classList.remove('overlay--open');
        overlay.hidden = true;
        document.body.classList.remove('no-scroll');
        document.body.classList.toggle('sidebar-collapsed', !open);
        saveDesktopState(open);
      } else if (open) {
        sidebar.classList.add('sidebar--open');
        overlay.classList.add('overlay--open');
        overlay.hidden = false;
        document.body.classList.add('no-scroll');

        const firstLink = sidebar.querySelector('.sidebar-link');
        if (firstLink) {
          firstLink.focus();
        }
      } else {
        sidebar.classList.remove('sidebar--open');
        overlay.classList.remove('overlay--open');
        overlay.hidden = true;
        document.body.classList.remove('no-scroll');
        if (returnFocus) {
          menuToggle.focus();
        }
      }

      menuToggle.setAttribute('aria-expanded', String(open));
    }

    function resetForBreakpoint() {
      sidebar.classList.remove('sidebar--open');
      overlay.classList.remove('overlay--open');
      overlay.hidden = true;
      document.body.classList.remove('no-scroll');

      if (mq.matches) {
        isOpen = readDesktopState();
        document.body.classList.toggle('sidebar-collapsed', !isOpen);
      } else {
        isOpen = false;
        document.body.classList.remove('sidebar-collapsed');
      }

      menuToggle.setAttribute('aria-expanded', String(isOpen));
    }

    menuToggle.addEventListener('click', () => {
      setOpen(!isOpen, true);
    });

    overlay.addEventListener('click', () => {
      if (!mq.matches && isOpen) {
        setOpen(false, true);
      }
    });

    sidebar.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (!mq.matches && isOpen) {
          setOpen(false, true);
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen || mq.matches) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, true);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableEls = Array.from(
        sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((element) => element.getClientRects().length > 0);
      if (focusableEls.length === 0) {
        return;
      }

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      const focusIsInside = sidebar.contains(document.activeElement);
      if (event.shiftKey && (!focusIsInside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusIsInside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    });

    mq.addEventListener('change', resetForBreakpoint);
    resetForBreakpoint();
  }

  /* ---------- Element references (form) ---------- */
  const requestForm = document.getElementById('request-form');
  const saveDraftBtn = document.getElementById('save-draft');
  const serviceCategory = document.getElementById('service-category');
  const requestDetails = document.getElementById('request-details');
  const pickupDate = document.getElementById('pickup-date');

  const charCounter = document.getElementById('char-counter');
  const formStatus = document.getElementById('form-status');
  const pendingValueEl = document.getElementById('metric-pending-value');
  const requestsTableBody = document.getElementById('requests-table-body');

  const MAX_CHARS = 300;
  const MIN_DETAILS = 20;

  /* ---------- Field error helpers ---------- */
  function getErrorEl(field) {
    const errorId = field
      .getAttribute('aria-describedby')
      .split(' ')
      .find((id) => id.endsWith('-error'));
    return document.getElementById(errorId);
  }

  function showError(field, message) {
    const errorEl = getErrorEl(field);
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function clearFieldError(field) {
    const errorEl = getErrorEl(field);
    field.classList.remove('is-invalid');
    field.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  // Clear errors live while the user types / changes a field
  [serviceCategory, requestDetails, pickupDate].forEach((field) => {
    field.addEventListener('input', () => clearFieldError(field));
    field.addEventListener('change', () => clearFieldError(field));
  });

  /* ---------- Live character counter ---------- */
  function updateCounter() {
    const length = requestDetails.value.length;
    charCounter.textContent = `${length} / ${MAX_CHARS}`;
    charCounter.classList.toggle('char-counter--warning', length >= MAX_CHARS * 0.8);
    // "Save Draft" enabled only when the textarea has text
    saveDraftBtn.disabled = length === 0;
  }
  requestDetails.addEventListener('input', updateCounter);

  // Initial state
  saveDraftBtn.disabled = requestDetails.value.length === 0;
  charCounter.textContent = `0 / ${MAX_CHARS}`;

  /* ---------- Form validation ---------- */
  function validateForm() {
    let firstInvalid = null;

    // Field 1: Service category must be selected
    if (!serviceCategory.value) {
      showError(serviceCategory, 'Please choose a service category.');
      if (!firstInvalid) {
        firstInvalid = serviceCategory;
      }
    }

    // Field 2: Details must be at least 20 characters
    if (requestDetails.value.trim().length < MIN_DETAILS) {
      showError(
        requestDetails,
        'Please enter at least 20 characters describing your request.'
      );
      if (!firstInvalid) {
        firstInvalid = requestDetails;
      }
    }

    return { valid: firstInvalid === null, firstInvalid };
  }

  /* ---------- Form submit ---------- */
  requestForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // Reset feedback area
    formStatus.textContent = '';
    formStatus.className = 'form-status';
    formStatus.classList.remove('form-status--success');

    const result = validateForm();
    if (!result.valid) {
      // Move focus to the first invalid field
      result.firstInvalid.focus();
      return;
    }

    // --- Valid submission ---

    // Generate a reference number: REQ-2026-XXXX
    const refNumber = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Show success message in the aria-live region
    formStatus.textContent = `Request submitted! Your reference number is ${refNumber}.`;
    formStatus.classList.add('form-status--success');

    // Prepend a new "Pending" row to the Recent Requests table
    // (data-label attributes included so the mobile stacked-card view works)
    const today = new Date().toISOString().slice(0, 10);
    const formattedToday = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(`${today}T00:00:00Z`));
    const selectedOption = serviceCategory.options[serviceCategory.selectedIndex];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Request ID">${refNumber}</td>
      <td data-label="Service Type">${selectedOption.text}</td>
      <td data-label="Date Filed"><time datetime="${today}">${formattedToday}</time></td>
      <td data-label="Status"><span class="status-badge status-badge--pending"><span class="status-dot" aria-hidden="true"></span><span class="status-text">Pending</span></span></td>
    `;
    requestsTableBody.prepend(row);

    // Increment the "Pending Requests" metric
    const current = parseInt(pendingValueEl.textContent, 10) || 0;
    pendingValueEl.textContent = current + 1;

    // Reset form and derived UI state
    requestForm.reset();
    updateCounter(); // sets counter to 0 / 300 and disables Save Draft
    clearFieldError(serviceCategory);
    clearFieldError(requestDetails);
    clearFieldError(pickupDate);
  });
});
