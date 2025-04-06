// Function to check if a link is a post link
function isPostLink(link) {
  return link.href.includes('/status/') && link.querySelector('time');
}

// Function to handle post link clicks
function handlePostLinkClick(event) {
  if (isPostLink(event.currentTarget)) {
    event.preventDefault();
    const fullUrl = event.currentTarget.href;
    chrome.runtime.sendMessage({
      action: 'openInNewTab',
      url: fullUrl
    });
  }
}

// Function to add click handlers to post links
function addClickHandlers() {
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    if (isPostLink(link)) {
      link.addEventListener('click', handlePostLinkClick);
    }
  });
}

// Create a MutationObserver to watch for new links
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      addClickHandlers();
    }
  });
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial setup
addClickHandlers(); 