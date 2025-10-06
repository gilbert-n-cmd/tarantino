    function toggleChat() {
        var chatBox = document.getElementById("chat-box");
        chatBox.style.display = (chatBox.style.display === "block") ? "none" : "block";
    }
    function updateTime() {
            let now = new Date();
            document.getElementById("liveTime").innerText = now.toLocaleTimeString();
        }
        setInterval(updateTime, 1000);
        updateTime();

        function updateDate() {
            let now = new Date();
            document.getElementById("liveDate").innerText = now.toLocaleDateString();
        }
        setInterval(updateDate, 1000);
        updateDate();

document.addEventListener('DOMContentLoaded', function () {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav');

  navToggle.addEventListener('click', function () {
    navToggle.classList.toggle('active');
    nav.classList.toggle('active');
  });

  const searchToggle = document.querySelector('.search-toggle');
  const searchBar = document.querySelector('.search-bar');

  searchToggle.addEventListener('click', function () {
    if (searchBar.style.display === 'block') {
      searchBar.style.display = 'none';
    } else {
      searchBar.style.display = 'block';
    }
  });

  // New code to toggle dropdowns on small screens
  const dropdowns = document.querySelectorAll('nav .dropdown > a');
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const dropdownContent = this.nextElementSibling;
        if (dropdownContent) {
          dropdownContent.classList.toggle('active');
        }
      }
    });
  });

  const subDropdowns = document.querySelectorAll('nav .dropdown-submenu > a');
  subDropdowns.forEach(subDropdown => {
    subDropdown.addEventListener('click', function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const subDropdownContent = this.nextElementSibling;
        if (subDropdownContent) {
          subDropdownContent.classList.toggle('active');
        }
      }
    });
  });
});



function setBrightness(level) {
  const body = document.body;
  
  switch(level) {
    case 'low':
      body.style.filter = 'brightness(0.7)';
      break;
    case 'medium':
      body.style.filter = 'brightness(0.85)';
      break;
    case 'high':
      body.style.filter = 'brightness(1)';
      break;
    default:
      body.style.filter = 'brightness(1)';
  }
}


const backToTopBtn = document.getElementById("backToTopBtn");

  window.onscroll = function () {
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
      backToTopBtn.style.display = "block";
    } else {
      backToTopBtn.style.display = "none";
    }
  };

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  //language change

  const translations = {
    en: {
      headline: "Welcome",
      description: "This is an example of dynamic language switching."
    },
    fr: {
      headline: "Bienvenue",
      description: "Ceci est un exemple de changement de langue dynamique."
    },
    es: {
      headline: "Bienvenido",
      description: "Este es un ejemplo de cambio de idioma dinámico."
    }
  };

  const select = document.getElementById('language-select');
  select.addEventListener('change', () => {
    const lang = select.value;
    const t = translations[lang];
    if (t) {
      document.getElementById('headline').textContent = t.headline;
      document.getElementById('description').textContent = t.description;
    }
  });
/*--------------------loading image ------------------------------ */
          // JavaScript
        document.addEventListener('DOMContentLoaded', function() {
            const splashScreen = document.getElementById('splash-screen');
            const aboutPage = document.getElementById('about-page');
            const aboutLink = document.getElementById('about-link');
            
            // Show splash screen when About link is clicked
            aboutLink.addEventListener('click', function(e) {
                e.preventDefault();
                aboutPage.style.display = 'block';
                splashScreen.style.display = 'flex';
            });
            
            // Hide splash screen when clicked or after timeout
            splashScreen.addEventListener('click', function() {
                hideSplash();
            });
            
            // Auto-hide after 3 seconds
            setTimeout(hideSplash, 3000);
            
            function hideSplash() {
                splashScreen.style.opacity = '0';
                setTimeout(function() {
                    splashScreen.style.display = 'none';
                }, 500); // Match this with CSS transition time
            }
        });
/*--------------------loading image end------------------------------ */


  const navLinks = document.querySelectorAll('.nav-link');
  const loader = document.getElementById('loading-screen');

  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault(); // Prevent default page change
      loader.style.display = 'flex'; // Show loader

      const targetUrl = this.href; // Get full URL of target

      setTimeout(() => {
        window.location.href = targetUrl; // Navigate after delay
      }, 100); // Delay (in ms)
    });
  });

  // Hide the loading spinner once the page is fully loaded
  window.addEventListener('load', function () {
    document.getElementById('loading-spinner').style.display = 'none';
  });




