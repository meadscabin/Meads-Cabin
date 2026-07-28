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
});
