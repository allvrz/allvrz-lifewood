document.addEventListener('DOMContentLoaded', function() {

    // ===============================================
    // == SECTION 1: PAGE-SPECIFIC LOGIC            ==
    // ===============================================

    // --- Logic for the LOGIN PAGE (admin.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    window.location.href = 'admin-dashboard.html';
                })
                .catch((error) => {
                    errorDiv.textContent = "Invalid email or password.";
                    console.error("Login Error:", error);
                });
        });
    }

    // --- Logic for the ADMIN DASHBOARD PAGE (admin-dashboard.html) ---
    if (window.location.pathname.endsWith('admin-dashboard.html')) {
        
        // Dashboard Protection
        auth.onAuthStateChanged(user => {
            if (!user) {
                alert('Access denied. Please log in.');
                window.location.href = 'admin.html';
            } else {
                // If the user is logged in, we can safely run all the dashboard-specific code.
                initializeDashboard();
            }
        });

        // This function holds all the code that should ONLY run on the dashboard.
        function initializeDashboard() {
            // Logout Button
            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    auth.signOut().then(() => {
                        alert('You have been logged out successfully.');
                        window.location.href = 'index.html';
                    });
                });
            }
            
            // Tab Functionality
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');
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

            // --- Dashboard Data Rendering & Actions ---
            const pendingTableBody = document.getElementById('pending-applications-body');
            const acceptedTableBody = document.getElementById('accepted-applications-body');
            const unresolvedTableBody = document.getElementById('unresolved-concerns-body');
            const resolvedTableBody = document.getElementById('resolved-concerns-body');

            async function renderApplicationTables() {
                pendingTableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
                acceptedTableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

                const pendingSnapshot = await db.collection('applications').where('status', '==', 'pending').orderBy('submittedOn', 'desc').get();
                pendingTableBody.innerHTML = '';
                if (pendingSnapshot.empty) {
                    pendingTableBody.innerHTML = `<tr><td colspan="7">No pending applications.</td></tr>`;
                } else {
                    pendingSnapshot.forEach(doc => {
                        const app = doc.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${app.name}</td><td>${app.email}</td><td>${app.project}</td><td><a href="${app.resume}" target="_blank" rel="noopener noreferrer">View</a></td><td>${app.submittedOn.toDate().toLocaleString()}</td><td>${app.availability}</td><td><button class="action-btn accept" data-doc-id="${doc.id}">Accept</button></td>`;
                        pendingTableBody.appendChild(row);
                    });
                }

                const acceptedSnapshot = await db.collection('applications').where('status', '==', 'accepted').orderBy('submittedOn', 'desc').get();
                acceptedTableBody.innerHTML = '';
                if (acceptedSnapshot.empty) {
                    acceptedTableBody.innerHTML = `<tr><td colspan="6">No accepted applications.</td></tr>`;
                } else {
                    acceptedSnapshot.forEach(doc => {
                        const app = doc.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${app.name}</td><td>${app.email}</td><td>${app.project}</td><td><a href="${app.resume}" target="_blank" rel="noopener noreferrer">View</a></td><td>${app.submittedOn.toDate().toLocaleString()}</td><td>${app.availability}</td>`;
                        acceptedTableBody.appendChild(row);
                    });
                }
            }

             pendingTableBody.addEventListener('click', async (e) => {
                const target = e.target;
                if (target && target.classList.contains('action-btn')) {
                    const docId = target.dataset.docId;
                    
                    if (target.classList.contains('accept')) {
                        if (confirm('Are you sure you want to accept this application?')) {
                            target.disabled = true;
                            await db.collection('applications').doc(docId).update({
                                status: 'accepted',
                                acceptedOn: firebase.firestore.FieldValue.serverTimestamp() // NEW
                            });
                            renderApplicationTables();
                        }
                    } 
                }
            });

            async function renderConcernsTables() {
                unresolvedTableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
                resolvedTableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
                
                const unresolvedSnapshot = await db.collection('concerns').where('status', '==', 'unresolved').orderBy('submittedOn', 'desc').get();
                unresolvedTableBody.innerHTML = '';
                if (unresolvedSnapshot.empty) {
                    unresolvedTableBody.innerHTML = `<tr><td colspan="6">No unresolved concerns.</td></tr>`;
                } else {
                    unresolvedSnapshot.forEach(doc => {
                        const con = doc.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${con.name}</td><td>${con.email}</td><td>${con.interests}</td><td title="${con.message}">${con.message.substring(0, 50)}...</td><td>${con.submittedOn.toDate().toLocaleString()}</td><td><button class="action-btn resolve" data-doc-id="${doc.id}">Resolve</button></td>`;
                        unresolvedTableBody.appendChild(row);
                    });
                }

                const resolvedSnapshot = await db.collection('concerns').where('status', '==', 'resolved').orderBy('submittedOn', 'desc').get();
                resolvedTableBody.innerHTML = '';
                if (resolvedSnapshot.empty) {
                    resolvedTableBody.innerHTML = `<tr><td colspan="5">No resolved concerns.</td></tr>`;
                } else {
                    resolvedSnapshot.forEach(doc => {
                        const con = doc.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${con.name}</td><td>${con.email}</td><td>${con.interests}</td><td title="${con.message}">${con.message.substring(0, 50)}...</td><td>${con.submittedOn.toDate().toLocaleString()}</td>`;
                        resolvedTableBody.appendChild(row);
                    });
                }
            }

            unresolvedTableBody.addEventListener('click', async (e) => {
                if (e.target && e.target.classList.contains('resolve')) {
                    if (confirm('Are you sure you want to mark this concern as resolved?')) {
                        e.target.disabled = true;
                        await db.collection('concerns').doc(e.target.dataset.docId).update({
                            status: 'resolved',
                            resolvedOn: firebase.firestore.FieldValue.serverTimestamp() // NEW
                        });
                        renderConcernsTables();
                    }
                }
            });

            // Initial render of all tables on dashboard load
            renderApplicationTables();
            renderConcernsTables();
        }
    }

    // ===============================================
    // == SECTION 2: SITE-WIDE FUNCTIONALITY        ==
    // ===============================================
    
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
    // General function to handle modal closing
    const closeModal = (modal) => {
        if (modal) {
            modal.classList.remove('is-active');
            document.body.classList.remove('modal-open');
            // If it's the YouTube modal, stop the video
            const iframe = modal.querySelector('iframe');
            if (iframe) {
                iframe.src = "";
            }
        }
    };
    
    // Keydown listener for all modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.project-modal.is-active').forEach(modal => closeModal(modal));
        }
    });

    // YouTube Video Modal
    const videoModal = document.getElementById('videoModal');
    if (videoModal) {
        const playBtn = document.getElementById('play-video-btn');
        const closeBtn = document.getElementById('closeModalBtn');
        const modalIframe = document.getElementById('youtubeIframe');
        const videoId = "WocWafisMUI";
        const youtubeURL = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
        
        playBtn.addEventListener('click', () => {
            videoModal.classList.add('is-active');
            document.body.classList.add('modal-open');
            modalIframe.src = youtubeURL;
        });
        closeBtn.addEventListener('click', () => closeModal(videoModal));
        videoModal.addEventListener('click', e => e.target === videoModal && closeModal(videoModal));
    }
    
    // Project Detail Modal
    const projectModal = document.getElementById('projectModal');
    if (projectModal) {
        const openModalButtons = document.querySelectorAll('.open-project-modal');
        const closeModalButton = document.getElementById('closeProjectModal');
        const modalContentTarget = document.getElementById('modal-content-target');
        const modalContentContainer = document.querySelector('.project-modal-content');
        
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

    // Job Application Modal and Form
    const applicationModal = document.getElementById('applicationModal');
    if (applicationModal) {
        const openBtn = document.getElementById('openApplyModalBtn');
        const closeBtn = document.getElementById('closeApplicationModalBtn');
        const applicationForm = document.getElementById('jobApplicationForm');
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
                alert('Application submitted successfully!');
                applicationForm.reset();
                closeModal(applicationModal);
            }).catch((error) => {
                console.error("Error adding application: ", error);
                alert('There was an error submitting your application. Please try again.');
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Application';
            });
        });
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
                alert('Thank you for your message! We will get back to you shortly.');
                contactForm.reset();
            }).catch((error) => {
                console.error("Error adding concern: ", error);
                alert('There was an error submitting your message. Please try again.');
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            });
        });
    }

});
