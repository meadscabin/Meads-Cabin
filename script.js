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
});
