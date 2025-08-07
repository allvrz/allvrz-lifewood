// This is a site-wide canary to prove the script is loading.
console.log("Script.js has started executing.");

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed.");

    // This is the router. It checks which page we are on and runs ONLY the relevant code.
    const path = window.location.pathname;

    if (path.includes('admin-dashboard.html')) {
        console.log("Running on: Admin Dashboard Page");
        initializeDashboard();
    } else if (path.includes('admin.html')) {
        console.log("Running on: Login Page");
        initializeLoginPage();
    } else {
        console.log("Running on: Public Page");
        initializePublicSite();
    }
});

// =====================================================================
// == NEW: REUSABLE CUSTOM MODAL FUNCTIONS                          ==
// =====================================================================

/**
 * Displays a custom notification pop-up.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('success' or 'error').
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.classList.add('notification-popup', type);
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 4000);
}

/**
 * Displays a custom confirmation modal and returns a Promise.
 * @param {string} message The message to display in the modal.
 * @returns {Promise<void>} A promise that resolves on confirm, and rejects on cancel.
 */
function showConfirmationModal(message) {
    const modal = document.getElementById('confirmationModal');
    const messageEl = document.getElementById('confirmMessageText');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Fallback to default confirm if modal elements are missing
    if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
        return new Promise((resolve, reject) => {
            if (confirm(message)) {
                resolve();
            } else {
                reject(null); // Reject with null to indicate user cancellation
            }
        });
    }

    return new Promise((resolve, reject) => {
        messageEl.textContent = message;
        modal.classList.add('is-active');

        const resolvePromise = () => {
            modal.classList.remove('is-active');
            cleanUpListeners();
            resolve();
        };

        const rejectPromise = () => {
            modal.classList.remove('is-active');
            cleanUpListeners();
            reject(null); // Reject with null to indicate user cancellation
        };

        const outsideClickHandler = (e) => {
            if (e.target === modal) {
                rejectPromise();
            }
        };

        const cleanUpListeners = () => {
            confirmBtn.removeEventListener('click', resolvePromise);
            cancelBtn.removeEventListener('click', rejectPromise);
            modal.removeEventListener('click', outsideClickHandler);
        };

        confirmBtn.addEventListener('click', resolvePromise);
        cancelBtn.addEventListener('click', rejectPromise);
        modal.addEventListener('click', outsideClickHandler);
    });
}


// =====================================================================
// == PAGE INITIALIZATION FUNCTIONS                                 ==
// =====================================================================

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => { window.location.href = 'admin-dashboard.html'; })
            .catch((error) => {
                errorDiv.textContent = "Invalid email or password.";
                console.error("Login Error:", error);
                submitButton.disabled = false;
            });
    });
}

function initializeDashboard() {
    auth.onAuthStateChanged(user => {
        if (user) {
            runDashboardCode();
        } else {
            alert('Access denied. Please log in.');
            window.location.href = 'admin.html';
        }
    });

    function runDashboardCode() {
        // Get all necessary element references
        const logoutButton = document.getElementById('logout-button');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const pendingTableBody = document.getElementById('pending-applications-body');
        const acceptedTableBody = document.getElementById('accepted-applications-body');
        const unresolvedTableBody = document.getElementById('unresolved-concerns-body');
        const resolvedTableBody = document.getElementById('resolved-concerns-body');
        const detailsModal = document.getElementById('detailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const closeDetailsModalBtn = document.getElementById('closeDetailsModal');

        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut().then(() => {
                    showNotification('You have been logged out successfully.', 'success');
                    setTimeout(() => window.location.href = 'index.html', 1500);
                });
            });
        }
        
        if (tabButtons.length > 0) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetTabId = button.dataset.tab;
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    button.classList.add('active');
                    document.getElementById(targetTabId).classList.add('active');
                });
            });
        }

        if (detailsModal && closeDetailsModalBtn) {
            closeDetailsModalBtn.addEventListener('click', () => detailsModal.classList.remove('is-active'));
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) detailsModal.classList.remove('is-active');
            });
        }

        async function renderApplicationTables() {
            pendingTableBody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
            acceptedTableBody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

            try {
                const pendingSnapshot = await db.collection('applications').where('status', '==', 'pending').orderBy('submittedOn', 'desc').get();
                pendingTableBody.innerHTML = '';
                if (pendingSnapshot.empty) {
                    pendingTableBody.innerHTML = `<tr><td colspan="8">No pending applications.</td></tr>`;
                } else {
                    pendingSnapshot.docs.forEach((doc, index) => {
                        const app = doc.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${index + 1}</td><td>${app.name}</td><td>${app.email}</td><td>${app.project}</td><td><a href="${app.resume}" target="_blank" rel="noopener noreferrer">View</a></td><td>${app.submittedOn.toDate().toLocaleString()}</td><td>${app.availability}</td><td class="actions-column"><button class="action-btn accept" data-doc-id="${doc.id}">Accept</button><button class="action-btn reject" data-doc-id="${doc.id}">Reject</button></td>`;
                        pendingTableBody.appendChild(row);
                    });
                }

                const acceptedSnapshot = await db.collection('applications').where('status', '==', 'accepted').orderBy('acceptedOn', 'desc').get();
                acceptedTableBody.innerHTML = '';
                if (acceptedSnapshot.empty) {
                    acceptedTableBody.innerHTML = `<tr><td colspan="8">No accepted applications.</td></tr>`;
                } else {
                    acceptedSnapshot.docs.forEach((doc, index) => {
                        const app = doc.data();
                        const acceptedOnDate = app.acceptedOn ? app.acceptedOn.toDate().toLocaleString() : 'N/A';
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${index + 1}</td><td>${app.name}</td><td>${app.email}</td><td>${app.project}</td><td><button class="action-btn view" data-type="application" data-doc-id="${doc.id}">View Details</button></td><td>${app.submittedOn.toDate().toLocaleString()}</td><td>${acceptedOnDate}</td><td>${app.availability}</td>`;
                        acceptedTableBody.appendChild(row);
                    });
                }
            } catch (error) {
                console.error("Error rendering application tables:", error);
                pendingTableBody.innerHTML = `<tr><td colspan="8">Error loading data. Check console for index link.</td></tr>`;
                acceptedTableBody.innerHTML = `<tr><td colspan="8">Error loading data. Check console for index link.</td></tr>`;
            }
        }

        async function renderConcernsTables() {
            unresolvedTableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
            resolvedTableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
            
            try {
                const unresolvedSnapshot = await db.collection('concerns').where('status', '==', 'unresolved').orderBy('submittedOn', 'desc').get();
                unresolvedTableBody.innerHTML = '';
                if (unresolvedSnapshot.empty) {
                    unresolvedTableBody.innerHTML = `<tr><td colspan="7">No unresolved concerns.</td></tr>`;
                } else {
                    unresolvedSnapshot.docs.forEach((doc, index) => {
                        const con = doc.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${index + 1}</td><td>${con.name}</td><td>${con.email}</td><td>${con.interests}</td><td title="${con.message}">${con.message.substring(0, 30)}...</td><td>${con.submittedOn.toDate().toLocaleString()}</td><td class="actions-column"><button class="action-btn resolve" data-doc-id="${doc.id}">Resolve</button></td>`;
                        unresolvedTableBody.appendChild(row);
                    });
                }

                const resolvedSnapshot = await db.collection('concerns').where('status', '==', 'resolved').orderBy('resolvedOn', 'desc').get();
                resolvedTableBody.innerHTML = '';
                if (resolvedSnapshot.empty) {
                    resolvedTableBody.innerHTML = `<tr><td colspan="7">No resolved concerns.</td></tr>`;
                } else {
                    resolvedSnapshot.docs.forEach((doc, index) => {
                        const con = doc.data();
                        const resolvedOnDate = con.resolvedOn ? con.resolvedOn.toDate().toLocaleString() : 'N/A';
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${index + 1}</td><td>${con.name}</td><td>${con.email}</td><td>${con.interests}</td><td><button class="action-btn view" data-type="concern" data-doc-id="${doc.id}">View Message</button></td><td>${con.submittedOn.toDate().toLocaleString()}</td><td>${resolvedOnDate}</td>`;
                        resolvedTableBody.appendChild(row);
                    });
                }
            } catch (error) {
                console.error("Error rendering concerns tables:", error);
                unresolvedTableBody.innerHTML = `<tr><td colspan="7">Error loading data. Check console for index link.</td></tr>`;
                resolvedTableBody.innerHTML = `<tr><td colspan="7">Error loading data. Check console for index link.</td></tr>`;
            }
        }

        pendingTableBody.addEventListener('click', async (e) => {
            const target = e.target;
            if (target && target.classList.contains('action-btn')) {
                const docId = target.dataset.docId;
                
                const appDoc = await db.collection('applications').doc(docId).get();
                if (!appDoc.exists) return;
                const appData = appDoc.data();

                const templateParams = { applicant_name: appData.name, applicant_email: appData.email, project_name: appData.project, email_title: '', main_paragraph: '', next_steps_paragraph: '', closing_line: '' };
                let newStatus = '', confirmMessage = '';

                if (target.classList.contains('accept')) {
                    newStatus = 'accepted';
                    confirmMessage = 'Accept and notify applicant?';
                    templateParams.email_title = "Congratulations!";
                    templateParams.main_paragraph = "It is with great pleasure that we officially welcome you! We are thrilled to confirm that your application to contribute to the following project has been successful.";
                    templateParams.next_steps_paragraph = "Our project coordinator will be in contact with you shortly to discuss the next steps, including your start date and the project onboarding process.";
                    templateParams.closing_line = "We look forward to having you on the project.";
                } else if (target.classList.contains('reject')) {
                    newStatus = 'rejected';
                    confirmMessage = 'Reject and notify applicant?';
                    templateParams.email_title = "Thank You for Your Interest";
                    templateParams.main_paragraph = "Thank you for your interest in Lifewood and for taking the time to apply. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match the current needs of this project.";
                    templateParams.next_steps_paragraph = "This was a very competitive process, and we encourage you to apply for other positions in the future.";
                    templateParams.closing_line = "We wish you the best of luck in your job search.";
                }

                if (newStatus) {
                    try {
                        await showConfirmationModal(confirmMessage);
                        target.disabled = true;
                        target.textContent = 'Sending...';

                        await emailjs.send(emailjsConfig.serviceID, emailjsConfig.templateID, templateParams, emailjsConfig.publicKey);
                        
                        const updateData = { status: newStatus };
                        if (newStatus === 'accepted') {
                            updateData.acceptedOn = firebase.firestore.FieldValue.serverTimestamp();
                        }
                        await db.collection('applications').doc(docId).update(updateData);
                        
                        showNotification(`Applicant notified of their '${newStatus}' status.`, 'success');
                    } catch (error) {
                        if (error) {
                             console.error('Failed to send email or update status:', error);
                             showNotification('An error occurred. Check the console.', 'error');
                        } else {
                             console.log("Action cancelled by user.");
                        }
                    } finally {
                        renderApplicationTables();
                    }
                }
            }
        });

        unresolvedTableBody.addEventListener('click', async (e) => {
            if (e.target && e.target.classList.contains('resolve')) {
                const docId = e.target.dataset.docId;
                try {
                    await showConfirmationModal('Are you sure you want to mark this concern as resolved?');
                    target.disabled = true;
                    await db.collection('concerns').doc(docId).update({
                        status: 'resolved',
                        resolvedOn: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showNotification('Concern has been marked as resolved.', 'success');
                } catch (error) {
                     if (error) {
                         console.error('Failed to resolve concern:', error);
                         showNotification('An error occurred. Check the console.', 'error');
                     } else {
                         console.log("Action cancelled by user.");
                     }
                } finally {
                    renderConcernsTables();
                }
            }
        });

        document.querySelector('.tab-content-container').addEventListener('click', async (e) => {
            if (e.target && e.target.classList.contains('view')) {
                const docId = e.target.dataset.docId;
                const type = e.target.dataset.type;
                if (type === 'application') {
                    const doc = await db.collection('applications').doc(docId).get();
                    const data = doc.data();
                    modalTitle.textContent = `Application: ${data.name}`;
                    modalBody.innerHTML = `<p><strong>Project:</strong> ${data.project}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Availability:</strong> ${data.availability}</p><p><strong>Resume:</strong> <a href="${data.resume}" target="_blank" rel="noopener noreferrer">Open Link</a></p><p><strong>Submitted On:</strong> ${data.submittedOn.toDate().toLocaleString()}</p><p><strong>Accepted On:</strong> ${data.acceptedOn ? data.acceptedOn.toDate().toLocaleString() : 'N/A'}</p>`;
                } else if (type === 'concern') {
                    const doc = await db.collection('concerns').doc(docId).get();
                    const data = doc.data();
                    modalTitle.textContent = `Concern from: ${data.name}`;
                    modalBody.innerHTML = `<p><strong>Interests:</strong> ${data.interests}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Message:</strong></p><p>${data.message}</p><p><strong>Submitted On:</strong> ${data.submittedOn.toDate().toLocaleString()}</p><p><strong>Resolved On:</strong> ${data.resolvedOn ? data.resolvedOn.toDate().toLocaleString() : 'N/A'}</p>`;
                }
                if (detailsModal) detailsModal.classList.add('is-active');
            }
        });

        renderApplicationTables();
        renderConcernsTables();
    }
}

function initializePublicSite() {
    // --- Mobile Navigation Toggle ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.main-nav');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('is-open');
            navMenu.classList.toggle('is-open');
            document.body.style.overflow = navMenu.classList.contains('is-open') ? 'hidden' : '';
        });
    }

    // --- Scroll-triggered Animations ---
    const animatedElements = document.querySelectorAll('.anim-trigger, .fade-in, .animate-on-scroll');
    if ("IntersectionObserver" in window && animatedElements.length > 0) {
        const animationObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        animatedElements.forEach(element => animationObserver.observe(element));
    }

    // --- Animated Counter for Statistics ---
    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        const counters = document.querySelectorAll('.stat-number');
        const animationDuration = 2000;
        const counterObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    counters.forEach(counter => {
                        const target = +counter.getAttribute('data-target');
                        const updateCount = () => {
                            const current = +counter.innerText.replace(/,/g, '');
                            const increment = target / (animationDuration / 16);
                            if (current < target) {
                                counter.innerText = Math.ceil(current + increment).toLocaleString();
                                requestAnimationFrame(updateCount);
                            } else {
                                counter.innerText = target.toLocaleString() + (counter.dataset.suffix || '');
                            }
                        };
                        requestAnimationFrame(updateCount);
                    });
                    counterObserver.disconnect();
                }
            });
        }, { threshold: 0.5 });
        counterObserver.observe(statsSection);
    }

    // --- Back to Top Button Logic ---
    const backToTopButton = document.querySelector('.back-to-top');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            backToTopButton.classList.toggle('visible', window.scrollY > 300);
        });
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Team Carousel (Swiper) ---
    if (document.querySelector('.team-carousel')) {
        new Swiper('.team-carousel', {
            autoplay: { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true },
            loop: true,
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            pagination: { el: '.swiper-pagination', clickable: true },
            slidesPerView: 1,
            spaceBetween: 30,
            breakpoints: { 640: { slidesPerView: 2 }, 992: { slidesPerView: 3 }, 1200: { slidesPerView: 4 } }
        });
    }
    
    // --- All Modals ---
    const closeModal = (modal) => {
        if (modal) {
            modal.classList.remove('is-active');
            document.body.classList.remove('modal-open');
            const iframe = modal.querySelector('iframe');
            if (iframe) { iframe.src = ""; }
        }
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.project-modal.is-active, .confirmation-modal.is-active').forEach(modal => closeModal(modal));
        }
    });

    // --- YouTube Video Modal ---
    const videoModal = document.getElementById('videoModal');
    if (videoModal) {
        const playBtn = document.getElementById('play-video-btn');
        const closeBtn = videoModal.querySelector('.close-modal-btn');
        if(playBtn && closeBtn){
            const modalIframe = document.getElementById('youtubeIframe');
            const videoId = "WocWafisMUI";
            const youtubeURL = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
            
            playBtn.addEventListener('click', () => {
                videoModal.classList.add('is-active');
                document.body.classList.add('modal-open');
                if(modalIframe) modalIframe.src = youtubeURL;
            });
            closeBtn.addEventListener('click', () => closeModal(videoModal));
            videoModal.addEventListener('click', e => e.target === videoModal && closeModal(videoModal));
        }
    }
    
    // --- Project Detail Modal ---
    const projectModal = document.getElementById('projectModal');
    if (projectModal) {
        const openModalButtons = document.querySelectorAll('.open-project-modal');
        const closeModalButton = document.getElementById('closeProjectModal');
        if(openModalButtons.length > 0 && closeModalButton){
            const modalContentTarget = document.getElementById('modal-content-target');
            const modalContentContainer = projectModal.querySelector('.project-modal-content');
            
            openModalButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const projectID = button.dataset.project;
                    const sourceContent = document.getElementById(`project-detail-${projectID}`);
                    if (sourceContent && modalContentTarget) {
                        modalContentTarget.innerHTML = sourceContent.innerHTML;
                        projectModal.classList.add('is-active');
                        document.body.classList.add('modal-open');
                        if (modalContentContainer) modalContentContainer.scrollTop = 0;
                    }
                });
            });
            closeModalButton.addEventListener('click', () => closeModal(projectModal));
            projectModal.addEventListener('click', e => e.target === projectModal && closeModal(projectModal));
        }
    }

    // --- Job Application Modal and Form ---
    const applicationModal = document.getElementById('applicationModal');
    if (applicationModal) {
        const openBtn = document.getElementById('openApplyModalBtn');
        const closeBtn = document.getElementById('closeApplicationModalBtn');
        const applicationForm = document.getElementById('jobApplicationForm');
        
        if(openBtn && closeBtn && applicationForm){
            const dobInput = document.getElementById('dob');
            const ageInput = document.getElementById('age');
            const startHourSelect = document.getElementById('startHour');
            const startMinuteSelect = document.getElementById('startMinute');
            const startPeriodSelect = document.getElementById('startPeriod');
            const endHourSelect = document.getElementById('endHour');
            const endMinuteSelect = document.getElementById('endMinute');
            const endPeriodSelect = document.getElementById('endPeriod');

            openBtn.addEventListener('click', () => {
                applicationModal.classList.add('is-active');
                document.body.classList.add('modal-open');
            });
            closeBtn.addEventListener('click', () => closeModal(applicationModal));
            applicationModal.addEventListener('click', e => e.target === applicationModal && closeModal(applicationModal));

            dobInput.addEventListener('change', () => {
                if (dobInput.value) {
                    const birthDate = new Date(dobInput.value);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
                    ageInput.value = age;
                } else { ageInput.value = ''; }
            });

            const populateHours = (selectEl) => { for (let i = 1; i <= 12; i++) { selectEl.add(new Option(i, i)); } };
            const populateMinutes = (selectEl) => { for (let i = 0; i < 60; i++) { const min = String(i).padStart(2, '0'); selectEl.add(new Option(min, min)); } };
            const populateAmPm = (selectEl) => { selectEl.add(new Option('AM', 'AM')); selectEl.add(new Option('PM', 'PM')); };
            
            populateHours(startHourSelect); populateHours(endHourSelect);
            populateMinutes(startMinuteSelect); populateMinutes(endMinuteSelect);
            populateAmPm(startPeriodSelect); populateAmPm(endPeriodSelect);
            
            applicationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const submitButton = applicationForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';
                const formData = new FormData(applicationForm);
                const availability = `${formData.get('startHour')}:${formData.get('startMinute')} ${formData.get('startPeriod')} - ${formData.get('endHour')}:${formData.get('endMinute')} ${formData.get('endPeriod')}`;

                db.collection("applications").add({
                    name: `${formData.get('firstName')} ${formData.get('lastName')}`,
                    email: formData.get('email'),
                    project: formData.get('projectAppliedFor'),
                    resume: formData.get('resumeLink'),
                    submittedOn: firebase.firestore.FieldValue.serverTimestamp(),
                    availability: availability,
                    status: 'pending'
                }).then(() => {
                    showNotification('Application submitted successfully!', 'success');
                    applicationForm.reset();
                    closeModal(applicationModal);
                }).catch((error) => {
                    console.error("Error adding application: ", error);
                    showNotification('There was an error submitting your application. Please try again.', 'error');
                }).finally(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                });
            });
        }
    }

    // --- Contact Form ---
    const contactForm = document.getElementById('interactive-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const submitButton = contactForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            const formData = new FormData(contactForm);

            db.collection("concerns").add({
                name: formData.get('name'),
                email: formData.get('email'),
                interests: formData.getAll('interest').join(', ') || 'General Inquiry',
                message: formData.get('message'),
                submittedOn: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'unresolved'
            }).then(() => {
                showNotification('Thank you! Your message has been sent.', 'success');
                contactForm.reset();
            }).catch((error) => {
                console.error("Error adding concern: ", error);
                showNotification('There was an error sending your message. Please try again.', 'error');
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            });
        });
    }
}
