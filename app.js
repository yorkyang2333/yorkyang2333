(function () {
  "use strict";

  var content = window.PROFILE_CONTENT;
  var page = document.body.dataset.page || "home";
  var languageKey = "yorkyang2333-language";
  var githubCacheKey = "yorkyang2333-github-cache";
  var currentLanguage = getInitialLanguage();
  var githubData = null;

  function getInitialLanguage() {
    try {
      var stored = window.localStorage.getItem(languageKey);
      return stored === "zh" || stored === "en" ? stored : "en";
    } catch (error) {
      return "en";
    }
  }

  function getValue(source, path) {
    return path.split(".").reduce(function (value, key) {
      return value && value[key];
    }, source);
  }

  function translateElement(element) {
    var key = element.dataset.i18n;
    var value = getValue(content[currentLanguage], key);
    if (typeof value === "string") {
      element.textContent = value;
    }

    if (element.dataset.i18nAttr) {
      var attributes = element.dataset.i18nAttr.split(",");
      attributes.forEach(function (attribute) {
        var attributeValue = getValue(content[currentLanguage], key);
        if (typeof attributeValue === "string") {
          element.setAttribute(attribute, attributeValue);
        }
      });
    }
  }

  function applyLanguage() {
    var dictionary = content[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach(translateElement);

    var title = document.querySelector("title[data-i18n]");
    if (title) {
      title.textContent = getValue(dictionary, title.dataset.i18n);
    }

    document.querySelectorAll("[data-language-value]").forEach(function (element) {
      element.textContent = dictionary.languageButton;
    });

    var toggle = document.getElementById("language-toggle");
    if (toggle) {
      toggle.setAttribute("aria-label", dictionary.languageLabel);
    }

    renderProjects();
    renderSocialLinks();
    updateActiveNavigation();
    if (githubData) {
      renderKpis(githubData);
      renderRepos(githubData);
      renderEvents(githubData);
    }
  }

  function switchLanguage() {
    currentLanguage = currentLanguage === "en" ? "zh" : "en";
    try {
      window.localStorage.setItem(languageKey, currentLanguage);
    } catch (error) {
      // Storage can be disabled in private browsing; the current page still switches.
    }
    applyLanguage();
    updateGithubLanguage();
  }

  function updateActiveNavigation() {
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      var isCurrent = link.dataset.nav === page;
      link.toggleAttribute("aria-current", isCurrent);
      link.classList.toggle("is-current", isCurrent);
    });
  }

  function setupNavigation() {
    var dialog = document.getElementById("mobile-nav");
    var openButton = document.getElementById("nav-toggle");
    var closeButton = document.getElementById("nav-close");
    var languageToggle = document.getElementById("language-toggle");

    if (languageToggle) {
      languageToggle.addEventListener("click", switchLanguage);
    }

    if (!dialog || !openButton) {
      return;
    }

    openButton.addEventListener("click", function () {
      dialog.showModal();
      openButton.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-is-open");
    });

    if (closeButton) {
      closeButton.addEventListener("click", function () {
        closeMobileNavigation();
      });
    }

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        closeMobileNavigation();
      }
    });

    dialog.addEventListener("close", function () {
      openButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-is-open");
    });

    dialog.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileNavigation);
    });
  }

  function closeMobileNavigation() {
    var dialog = document.getElementById("mobile-nav");
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  function setupReveals() {
    var revealItems = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach(function (element) {
        element.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries, observerInstance) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observerInstance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -2%" });

    revealItems.forEach(function (element) {
      observer.observe(element);
    });
  }

  function renderProjects() {
    var grid = document.getElementById("project-grid");
    if (!grid || !window.PROJECTS) {
      return;
    }

    var dictionary = content[currentLanguage];
    grid.innerHTML = window.PROJECTS.map(function (project, index) {
      var description = getValue(dictionary, project.descriptionKey);
      var tag = getValue(dictionary, project.tagKey);
      return '<a class="project-card reveal" href="' + project.href + '" target="_blank" rel="noreferrer" style="--delay: ' + (index * 60) + 'ms">' +
        '<div class="project-card-art"><img src="' + project.image + '" alt="Case ' + project.number + ' — ' + project.title + '"></div>' +
        '<div class="project-card-meta"><span class="project-number">CASE ' + project.number + '</span><span class="project-tag">' + tag + '</span></div>' +
        '<h3>' + project.title + '</h3>' +
        '<p>' + description + '</p>' +
        '<span class="text-link">' + dictionary.investigation.githubCta + ' <span aria-hidden="true">↗</span></span>' +
        '</a>';
    }).join("");
    setupReveals();
  }

  function renderSocialLinks() {
    var container = document.getElementById("social-links");
    if (!container || !window.SOCIAL_LINKS) {
      return;
    }
    container.innerHTML = window.SOCIAL_LINKS.map(function (link) {
      return '<a class="social-link" href="' + link.href + '" target="_blank" rel="noreferrer">' +
        '<span>' + link.label + '</span><span aria-hidden="true">↗</span></a>';
    }).join("");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(currentLanguage === "zh" ? "zh-CN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }
    return new Intl.DateTimeFormat(currentLanguage === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  }

  function getGitHubCache() {
    try {
      var cached = JSON.parse(window.sessionStorage.getItem(githubCacheKey));
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function setGitHubCache(data) {
    try {
      window.sessionStorage.setItem(githubCacheKey, JSON.stringify({ timestamp: Date.now(), data: data }));
    } catch (error) {
      // Caching is an enhancement, not a requirement for the live record.
    }
  }

  function fetchWithTimeout(url, signal) {
    return fetch(url, {
      signal: signal,
      headers: { Accept: "application/vnd.github+json" }
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("GitHub returned " + response.status);
      }
      return response.json();
    });
  }

  function fetchGitHubRecord() {
    var cached = getGitHubCache();
    if (cached) {
      return Promise.resolve(cached);
    }

    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 8000);
    var base = "https://api.github.com";
    return Promise.allSettled([
      fetchWithTimeout(base + "/users/yorkyang2333", controller.signal),
      fetchWithTimeout(base + "/users/yorkyang2333/repos?per_page=100&sort=updated", controller.signal),
      fetchWithTimeout(base + "/users/yorkyang2333/events/public?per_page=100", controller.signal)
    ]).then(function (results) {
      window.clearTimeout(timeout);
      var failed = results.some(function (result) { return result.status === "rejected"; });
      if (failed) {
        throw new Error("The public record could not be read completely.");
      }
      var data = { profile: results[0].value, repos: results[1].value, events: results[2].value };
      setGitHubCache(data);
      return data;
    }, function (error) {
      window.clearTimeout(timeout);
      throw error;
    });
  }

  function renderKpis(data) {
    var container = document.getElementById("github-kpis");
    if (!container) {
      return;
    }
    var repos = data.repos || [];
    var stars = repos.reduce(function (total, repo) { return total + (repo.stargazers_count || 0); }, 0);
    var forks = repos.reduce(function (total, repo) { return total + (repo.forks_count || 0); }, 0);
    var dictionary = content[currentLanguage];
    var items = [
      [dictionary.ledger.kpiRepos, data.profile.public_repos],
      [dictionary.ledger.kpiFollowers, data.profile.followers],
      [dictionary.ledger.kpiStars, stars],
      [dictionary.ledger.kpiForks, forks]
    ];
    container.innerHTML = items.map(function (item) {
      return '<div class="kpi"><span class="kpi-label">' + item[0] + '</span><strong>' + formatNumber(item[1]) + '</strong></div>';
    }).join("");
  }

  function renderRepos(data) {
    var list = document.getElementById("repo-list");
    if (!list) {
      return;
    }
    var dictionary = content[currentLanguage];
    var repos = (data.repos || []).filter(function (repo) { return !repo.fork; }).slice(0, 6);
    if (!repos.length) {
      list.innerHTML = '<p class="empty-state">' + dictionary.shared.noActivity + '</p>';
      return;
    }
    list.innerHTML = repos.map(function (repo, index) {
      return '<a class="repo-row reveal" href="' + repo.html_url + '" target="_blank" rel="noreferrer" style="--delay: ' + (index * 60) + 'ms">' +
        '<span class="repo-index">0' + (index + 1) + '</span>' +
        '<span class="repo-main"><strong>' + escapeHtml(repo.name) + '</strong><span>' + escapeHtml(repo.description || "") + '</span></span>' +
        '<span class="repo-language"><i style="--language-color: ' + languageColor(repo.language) + '"></i>' + escapeHtml(repo.language || "Unknown") + '</span>' +
        '<span class="repo-date">' + dictionary.shared.updated + ' ' + formatDate(repo.updated_at) + '</span>' +
        '<span class="repo-arrow" aria-hidden="true">↗</span>' +
        '</a>';
    }).join("");
    setupReveals();
  }

  function renderEvents(data) {
    var list = document.getElementById("activity-list");
    if (!list) {
      return;
    }
    var dictionary = content[currentLanguage];
    var eventMap = {
      PushEvent: dictionary.ledger.eventPush,
      CreateEvent: dictionary.ledger.eventCreate,
      IssuesEvent: dictionary.ledger.eventIssues,
      PullRequestEvent: dictionary.ledger.eventPullRequest,
      WatchEvent: dictionary.ledger.eventWatch,
      ForkEvent: dictionary.ledger.eventFork,
      ReleaseEvent: dictionary.ledger.eventRelease
    };
    var events = (data.events || []).filter(function (event) {
      return ["PushEvent", "CreateEvent", "IssuesEvent", "PullRequestEvent", "WatchEvent", "ForkEvent", "ReleaseEvent"].indexOf(event.type) !== -1;
    }).slice(0, 8);
    if (!events.length) {
      list.innerHTML = '<p class="empty-state">' + dictionary.shared.noActivity + '</p>';
      return;
    }
    list.innerHTML = events.map(function (event, index) {
      var action = eventMap[event.type] || dictionary.ledger.eventDefault;
      return '<li class="activity-item reveal" style="--delay: ' + (index * 60) + 'ms"><span class="activity-dot"></span><span class="activity-copy"><strong>' + action + '</strong> <a href="' + event.repo.url.replace("api.github.com/repos", "github.com") + '" target="_blank" rel="noreferrer">' + escapeHtml(event.repo.name) + '</a></span><time datetime="' + event.created_at + '">' + formatDate(event.created_at) + '</time></li>';
    }).join("");
    setupReveals();
  }

  function languageColor(language) {
    var colors = { Kotlin: "#a97bff", "C++": "#f34b7d", HTML: "#e34c26", Vue: "#41b883", JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572a5", Rust: "#dea584" };
    return colors[language] || "#a9fef7";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
    });
  }

  function setGithubStatus(kind) {
    var status = document.getElementById("github-status");
    if (!status) {
      return;
    }
    var dictionary = content[currentLanguage];
    status.className = "record-status " + kind;
    status.querySelector(".status-text").textContent = kind === "live" ? dictionary.shared.live : kind === "snapshot" ? dictionary.shared.snapshot : dictionary.shared.unavailable;
  }

  function loadGitHubRecord() {
    if (page !== "ledger") {
      return;
    }
    var status = document.getElementById("github-status");
    var loading = document.getElementById("github-loading");
    if (loading) {
      loading.textContent = content[currentLanguage].shared.loading;
    }
    fetchGitHubRecord().then(function (data) {
      if (loading) {
        loading.hidden = true;
      }
      githubData = data;
      renderKpis(data);
      renderRepos(data);
      renderEvents(data);
      setGithubStatus("live");
      if (status) {
        status.querySelector(".status-detail").textContent = content[currentLanguage].shared.updated + " " + new Intl.DateTimeFormat(currentLanguage === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date());
      }
    }).catch(function () {
      if (loading) {
        loading.hidden = true;
      }
      setGithubStatus("snapshot");
      var fallbackSection = document.getElementById("fallback-section");
      if (fallbackSection) {
        fallbackSection.hidden = false;
      }
      var fallback = document.getElementById("static-fallback");
      if (fallback) {
        fallback.hidden = false;
      }
      var message = document.getElementById("github-fallback-note");
      if (message) {
        message.textContent = content[currentLanguage].shared.fallbackNote;
        message.hidden = false;
      }
    });
  }

  function updateGithubLanguage() {
    if (page !== "ledger") {
      return;
    }
    var status = document.getElementById("github-status");
    var dictionary = content[currentLanguage];
    if (status && status.classList.contains("live") && status.querySelector(".status-detail").textContent) {
      status.querySelector(".status-detail").textContent = dictionary.shared.updated + " " + new Intl.DateTimeFormat(currentLanguage === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    }
    if (status && status.classList.contains("snapshot")) {
      status.querySelector(".status-text").textContent = dictionary.shared.snapshot;
    }
    var message = document.getElementById("github-fallback-note");
    if (message && !message.hidden) {
      message.textContent = dictionary.shared.fallbackNote;
    }
  }

  function init() {
    setupNavigation();
    applyLanguage();
    updateGithubLanguage();
    setupReveals();
    loadGitHubRecord();
    window.addEventListener("storage", function (event) {
      if (event.key === languageKey && (event.newValue === "en" || event.newValue === "zh")) {
        currentLanguage = event.newValue;
        applyLanguage();
        updateGithubLanguage();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
}());
