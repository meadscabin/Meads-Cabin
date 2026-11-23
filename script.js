document.addEventListener('DOMContentLoaded', () => {
    // Nav scroll effect
    const nav = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.height = '70px';
            nav.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
        } else {
            nav.style.height = '90px';
            nav.style.boxShadow = 'none';
        }
    });

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });

    // Toggle between Hosts and Wildlife tabs
    const toggleHostsBtn = document.getElementById('toggle-hosts');
    const toggleWildlifeBtn = document.getElementById('toggle-wildlife');
    const hostsTab = document.getElementById('hosts-tab-content');
    const wildlifeTab = document.getElementById('wildlife-tab-content');

    if (toggleHostsBtn && toggleWildlifeBtn && hostsTab && wildlifeTab) {
        toggleHostsBtn.addEventListener('click', () => {
            toggleHostsBtn.classList.add('active');
            toggleWildlifeBtn.classList.remove('active');
            hostsTab.classList.add('active');
            wildlifeTab.classList.remove('active');
        });

        toggleWildlifeBtn.addEventListener('click', () => {
            toggleWildlifeBtn.classList.add('active');
            toggleHostsBtn.classList.remove('active');
            wildlifeTab.classList.add('active');
            hostsTab.classList.remove('active');
        });
    }

    // Reviews carousel scroll arrows with dynamic visibility
    const carousel = document.querySelector('.reviews-carousel');
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');

    function updateArrowVisibility() {
        if (!carousel || !prevBtn || !nextBtn) return;
        
        // Hide left arrow if at start
        if (carousel.scrollLeft <= 5) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }

        // Hide right arrow if at end
        const isEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5;
        if (isEnd) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
        }
    }

    if (carousel && prevBtn && nextBtn) {
        // Initial check
        setTimeout(updateArrowVisibility, 200);
        
        carousel.addEventListener('scroll', updateArrowVisibility);
        
        prevBtn.addEventListener('click', () => {
            carousel.scrollBy({ left: -360, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            carousel.scrollBy({ left: 360, behavior: 'smooth' });
        });

        // Recalculate visibility on window resize
        window.addEventListener('resize', updateArrowVisibility);
    }

    // Gallery scroll arrows with dynamic visibility
    const gallery = document.querySelector('.horizontal-scroll-gallery');
    const gPrevBtn = document.querySelector('.gallery-control.prev');
    const gNextBtn = document.querySelector('.gallery-control.next');

    function updateGalleryArrowVisibility() {
        if (!gallery || !gPrevBtn || !gNextBtn) return;
        
        // Hide left arrow if at start
        if (gallery.scrollLeft <= 5) {
            gPrevBtn.classList.add('hidden');
        } else {
            gPrevBtn.classList.remove('hidden');
        }

        // Hide right arrow if at end
        const isEnd = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 5;
        if (isEnd) {
            gNextBtn.classList.add('hidden');
        } else {
            gNextBtn.classList.remove('hidden');
        }
    }

    if (gallery && gPrevBtn && gNextBtn) {
        // Initial check
        setTimeout(updateGalleryArrowVisibility, 200);
        
        gallery.addEventListener('scroll', updateGalleryArrowVisibility);
        
        gPrevBtn.addEventListener('click', () => {
            gallery.scrollBy({ left: -450, behavior: 'smooth' });
        });
        gNextBtn.addEventListener('click', () => {
            gallery.scrollBy({ left: 450, behavior: 'smooth' });
        });

        // Recalculate visibility on window resize
        window.addEventListener('resize', updateGalleryArrowVisibility);
    }

    // --- Guest Reviews: Load, Render & Submit (Cloudflare KV with localStorage fallback) ---
    const LOCAL_REVIEWS_KEY = 'meadscabin_reviews_v1';
    const reviewsCarousel = document.getElementById('reviews-carousel');
    const toggleFormBtn = document.getElementById('toggle-review-form-btn');
    const reviewCardEl = document.getElementById('leave-review-card');
    const reviewForm = document.getElementById('leave-review-form');
    const cancelReviewBtn = document.getElementById('cancel-review-btn');
    const nameInput = document.getElementById('review-name');
    const ratingInput = document.getElementById('review-rating');
    const textInput = document.getElementById('review-text');
    const starBtns = document.querySelectorAll('#star-rating-selector .star-btn');
    const starRatingLabel = document.getElementById('star-rating-label');
    const formError = document.getElementById('review-form-error');
    const formSuccess = document.getElementById('review-form-success');
    const submitReviewBtn = document.getElementById('submit-review-btn');
    const photoInput = document.getElementById('review-photo');
    const photoUploadText = document.getElementById('photo-upload-text');
    const photoPreviewWrapper = document.getElementById('photo-preview-wrapper');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    let selectedPhotoDataUrl = '';

    function openPhotoLightbox(src, altText) {
        const overlay = document.createElement('div');
        overlay.className = 'photo-lightbox-overlay';
        const img = document.createElement('img');
        img.src = src;
        img.alt = altText || 'Guest review photo';
        overlay.appendChild(img);
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    function compressImageFile(file, maxDimension = 900, quality = 0.78) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Please select a valid image file.'));
                return;
            }
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Could not read the selected image.'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Could not decode the selected image.'));
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxDimension || height > maxDimension) {
                        if (width >= height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (photoInput) {
        photoInput.addEventListener('change', async () => {
            const file = photoInput.files && photoInput.files[0];
            if (!file) return;
            try {
                if (photoUploadText) photoUploadText.textContent = 'Processing photo...';
                const compressed = await compressImageFile(file);
                selectedPhotoDataUrl = compressed;
                if (photoPreviewImg) photoPreviewImg.src = compressed;
                if (photoPreviewWrapper) photoPreviewWrapper.classList.remove('hidden');
                if (photoUploadText) photoUploadText.textContent = 'Change selected photo';
            } catch (err) {
                selectedPhotoDataUrl = '';
                if (photoUploadText) photoUploadText.textContent = 'Choose a photo from your stay';
                if (formError) {
                    formError.textContent = err.message || 'Could not process image.';
                    formError.classList.remove('hidden');
                }
            }
        });
    }

    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', () => {
            selectedPhotoDataUrl = '';
            if (photoInput) photoInput.value = '';
            if (photoPreviewImg) photoPreviewImg.src = '';
            if (photoPreviewWrapper) photoPreviewWrapper.classList.add('hidden');
            if (photoUploadText) photoUploadText.textContent = 'Choose a photo from your stay';
        });
    }

    function getLocalStore() {
        try {
            const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
            if (!raw) return { customReviews: [], hiddenDefaultIds: [] };
            const parsed = JSON.parse(raw);
            return {
                customReviews: Array.isArray(parsed.customReviews) ? parsed.customReviews : [],
                hiddenDefaultIds: Array.isArray(parsed.hiddenDefaultIds) ? parsed.hiddenDefaultIds : []
            };
        } catch {
            return { customReviews: [], hiddenDefaultIds: [] };
        }
    }

    function saveLocalStore(store) {
        try {
            localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(store));
        } catch {
            // Ignore storage quota errors
        }
    }

    function formatStars(rating) {
        const count = Math.max(1, Math.min(5, Number(rating) || 5));
        return '★'.repeat(count) + '☆'.repeat(5 - count);
    }

    function formatMonthYear(dateObj) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[dateObj.getMonth()]} ${String(dateObj.getFullYear()).slice(-2)}`;
    }

    function createReviewCardElement(review) {
        const card = document.createElement('div');
        card.className = 'review-card shadow-soft';
        card.dataset.reviewId = review.id;
        card.dataset.customReview = 'true';

        const starsEl = document.createElement('div');
        starsEl.className = 'stars';
        starsEl.textContent = formatStars(review.rating);
        card.appendChild(starsEl);

        if (review.text && review.text.trim().length > 0) {
            const textEl = document.createElement('p');
            textEl.className = 'review-text';
            textEl.textContent = `"${review.text.trim()}"`;
            card.appendChild(textEl);
        }

        if (review.photo && typeof review.photo === 'string' && review.photo.startsWith('data:image/')) {
            const photoWrap = document.createElement('div');
            photoWrap.className = 'review-photo-container';
            const photoImg = document.createElement('img');
            photoImg.className = 'review-photo-img';
            photoImg.src = review.photo;
            photoImg.alt = `Photo shared by ${review.name}`;
            photoImg.addEventListener('click', () => openPhotoLightbox(review.photo, photoImg.alt));
            photoWrap.appendChild(photoImg);
            card.appendChild(photoWrap);
        }

        const authorEl = document.createElement('div');
        authorEl.className = 'review-author';
        const strongEl = document.createElement('strong');
        strongEl.textContent = review.name;
        const dateEl = document.createElement('span');
        dateEl.textContent = review.date || '';
        authorEl.appendChild(strongEl);
        authorEl.appendChild(dateEl);
        card.appendChild(authorEl);

        return card;
    }

    function applyReviewsToCarousel(customReviews, hiddenDefaultIds) {
        if (!reviewsCarousel) return;

        // Remove any previously rendered custom reviews
        reviewsCarousel.querySelectorAll('[data-custom-review="true"]').forEach(el => el.remove());

        // Show or hide default reviews
        const hiddenSet = new Set(hiddenDefaultIds || []);
        reviewsCarousel.querySelectorAll('[data-review-id^="default-"]').forEach(el => {
            if (hiddenSet.has(el.dataset.reviewId)) {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });

        // Prepend custom reviews (newest first)
        const list = Array.isArray(customReviews) ? customReviews : [];
        for (let i = list.length - 1; i >= 0; i--) {
            const cardEl = createReviewCardElement(list[i]);
            reviewsCarousel.insertBefore(cardEl, reviewsCarousel.firstChild);
        }

        updateArrowVisibility();
    }

    async function loadReviews() {
        try {
            const res = await fetch('/api/reviews', { cache: 'no-store' });
            if (!res.ok) throw new Error('API unavailable');
            const data = await res.json();
            applyReviewsToCarousel(data.reviews || [], data.hiddenDefaultIds || []);
        } catch {
            const local = getLocalStore();
            applyReviewsToCarousel(local.customReviews, local.hiddenDefaultIds);
        }
    }

    loadReviews();

    // Star selector interaction
    let selectedRating = 0;

    function renderStarSelection(hoverValue = 0) {
        const activeValue = hoverValue || selectedRating;
        starBtns.forEach(btn => {
            const val = Number(btn.dataset.value);
            btn.classList.toggle('hovered', hoverValue > 0 && val <= hoverValue);
            btn.classList.toggle('selected', hoverValue === 0 && val <= selectedRating);
        });
        if (starRatingLabel) {
            if (activeValue > 0) {
                starRatingLabel.textContent = `${activeValue} out of 5 star${activeValue === 1 ? '' : 's'}`;
            } else {
                starRatingLabel.textContent = 'Select a rating (1–5)';
            }
        }
    }

    starBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            renderStarSelection(Number(btn.dataset.value));
        });
        btn.addEventListener('mouseleave', () => {
            renderStarSelection(0);
        });
        btn.addEventListener('click', () => {
            selectedRating = Number(btn.dataset.value);
            if (ratingInput) ratingInput.value = String(selectedRating);
            renderStarSelection(0);
        });
    });

    function resetReviewForm() {
        if (reviewForm) reviewForm.reset();
        selectedRating = 0;
        if (ratingInput) ratingInput.value = '';
        renderStarSelection(0);
        selectedPhotoDataUrl = '';
        if (photoInput) photoInput.value = '';
        if (photoPreviewImg) photoPreviewImg.src = '';
        if (photoPreviewWrapper) photoPreviewWrapper.classList.add('hidden');
        if (photoUploadText) photoUploadText.textContent = 'Choose a photo from your stay';
        if (formError) {
            formError.textContent = '';
            formError.classList.add('hidden');
        }
        if (formSuccess) {
            formSuccess.textContent = '';
            formSuccess.classList.add('hidden');
        }
    }

    if (toggleFormBtn && reviewCardEl) {
        toggleFormBtn.addEventListener('click', () => {
            const isHidden = reviewCardEl.classList.contains('hidden');
            if (isHidden) {
                reviewCardEl.classList.remove('hidden');
                if (formSuccess) formSuccess.classList.add('hidden');
                if (nameInput) nameInput.focus();
            } else {
                reviewCardEl.classList.add('hidden');
            }
        });
    }

    if (cancelReviewBtn && reviewCardEl) {
        cancelReviewBtn.addEventListener('click', () => {
            resetReviewForm();
            reviewCardEl.classList.add('hidden');
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (formError) {
                formError.textContent = '';
                formError.classList.add('hidden');
            }
            if (formSuccess) {
                formSuccess.textContent = '';
                formSuccess.classList.add('hidden');
            }

            const name = nameInput ? nameInput.value.trim() : '';
            const rating = Number(ratingInput ? ratingInput.value : 0);
            const text = textInput ? textInput.value.trim() : '';
            const photo = selectedPhotoDataUrl || '';

            if (!name) {
                if (formError) {
                    formError.textContent = 'Please enter your name.';
                    formError.classList.remove('hidden');
                }
                if (nameInput) nameInput.focus();
                return;
            }

            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                if (formError) {
                    formError.textContent = 'Please select a star rating out of 5.';
                    formError.classList.remove('hidden');
                }
                return;
            }

            if (submitReviewBtn) {
                submitReviewBtn.disabled = true;
                submitReviewBtn.textContent = 'Submitting...';
            }

            let createdReview = null;
            try {
                const res = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, rating, text, photo })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    if (res.status === 400 && errData.error) {
                        throw new Error(errData.error);
                    }
                    throw new Error('API_FALLBACK');
                }
                const data = await res.json();
                createdReview = data.review;
            } catch (err) {
                if (err.message && err.message !== 'API_FALLBACK' && err.message !== 'Failed to fetch') {
                    if (formError) {
                        formError.textContent = err.message;
                        formError.classList.remove('hidden');
                    }
                    if (submitReviewBtn) {
                        submitReviewBtn.disabled = false;
                        submitReviewBtn.textContent = 'Submit Review';
                    }
                    return;
                }
                // Local fallback when running without Cloudflare Pages Functions
                const local = getLocalStore();
                createdReview = {
                    id: `guest-${Date.now()}`,
                    name,
                    rating,
                    text,
                    photo,
                    date: formatMonthYear(new Date()),
                    createdAt: new Date().toISOString()
                };
                local.customReviews.unshift(createdReview);
                saveLocalStore(local);
            }

            if (createdReview && reviewsCarousel) {
                const cardEl = createReviewCardElement(createdReview);
                reviewsCarousel.insertBefore(cardEl, reviewsCarousel.firstChild);
                reviewsCarousel.scrollTo({ left: 0, behavior: 'smooth' });
                updateArrowVisibility();
            }

            resetReviewForm();
            if (formSuccess) {
                formSuccess.textContent = 'Thank you! Your review has been added to Guest Experiences.';
                formSuccess.classList.remove('hidden');
            }
            if (submitReviewBtn) {
                submitReviewBtn.disabled = false;
                submitReviewBtn.textContent = 'Submit Review';
            }
        });
    }
});
