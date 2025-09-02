// js/script.js — Haftalık/14 günlük pencere denetimi + HTML mesaj/confirm + bugfixler
(function () {
  const page = document.body.dataset.page || "index";

  /* ---------- Tarih yardımcıları ---------- */
  function parseYMD(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0); // local
  }
  function formatYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function isoToday() {
    return formatYMD(new Date());
  }
  function todayDateOnly() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function isPast(dayKey) {
    const d = parseYMD(dayKey);
    return d < todayDateOnly();
  }
  function mondayOf(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Mon=0 ... Sun=6
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /* ---------- Görsel yardımcı ---------- */
  function createIconImg(key, cls) {
    const img = document.createElement("img");
    if (cls) img.className = cls;
    img.src = `images/${key}.png`;
    img.onerror = function () {
      img.onerror = null;
      img.src = `images/${key}.svg`;
    };
    return img;
  }

  /* ---------- Mesaj & Confirm UI (alert/confirm yerine) ---------- */
  function ensureMessageUI() {
    if (document.getElementById("uxMessageOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "uxMessageOverlay";
    overlay.className = "message-box hidden";
    overlay.innerHTML = `
      <div class="message-content">
        <span id="uxMessageIcon">ℹ️</span>
        <div id="uxMessageText">Mesaj</div>
        <div id="uxMessageBtns" class="message-btns">
          <button id="uxMessageClose" class="pill">Kapat</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  function setMsgStyleByType(type) {
    const mc = document.querySelector(".message-content");
    if (!mc) return;
    mc.classList.remove("is-success", "is-warning", "is-error", "is-info");
    const map = {
      success: "is-success",
      warning: "is-warning",
      error: "is-error",
      info: "is-info",
    };
    mc.classList.add(map[type] || "is-info");
  }

  function showMessage(type, text) {
    ensureMessageUI();
    const box = document.getElementById("uxMessageOverlay");
    const icon = document.getElementById("uxMessageIcon");
    const msgText = document.getElementById("uxMessageText");
    const btns = document.getElementById("uxMessageBtns");

    let emoji = "ℹ️";
    if (type === "success") emoji = "🎉";
    else if (type === "warning") emoji = "⚠️";
    else if (type === "error") emoji = "❌";

    setMsgStyleByType(type);
    icon.textContent = emoji;
    msgText.textContent = text;

    // Tek butonlu bilgi kutusu
    btns.innerHTML = `<button id="uxMessageClose" class="pill">Kapat</button>`;
    box.classList.remove("hidden");
    document.getElementById("uxMessageClose").onclick = () => {
      box.classList.add("hidden");
    };
  }

  function showConfirm(type, text, confirmText = "Evet", cancelText = "Vazgeç") {
    ensureMessageUI();
    const box = document.getElementById("uxMessageOverlay");
    const icon = document.getElementById("uxMessageIcon");
    const msgText = document.getElementById("uxMessageText");
    const btns = document.getElementById("uxMessageBtns");

    let emoji = "ℹ️";
    if (type === "success") emoji = "🎉";
    else if (type === "warning") emoji = "⚠️";
    else if (type === "error") emoji = "❌";

    setMsgStyleByType(type);
    icon.textContent = emoji;
    msgText.textContent = text;

    btns.innerHTML = `
      <button id="uxConfirmNo" class="pill ghost">${cancelText}</button>
      <button id="uxConfirmYes" class="pill">${confirmText}</button>
    `;

    box.classList.remove("hidden");

    return new Promise((resolve) => {
      document.getElementById("uxConfirmYes").onclick = () => {
        box.classList.add("hidden");
        resolve(true);
      };
      document.getElementById("uxConfirmNo").onclick = () => {
        box.classList.add("hidden");
        resolve(false);
      };
    });
  }

  /* ---------- Kutlama (mevcut modal) ---------- */
  function showCelebration(message) {
  const cel = document.getElementById("celebrationModal");
  const msg = document.getElementById("celebrationMessage");
  const conf = document.getElementById("confettiContainer");
  if (!cel || !msg || !conf) {
    // Yedek: mesaj kutusu ile göster
    showMessage("success", message);
    return;
  }

  // Satır sonlarını <br> ile değiştir
  msg.innerHTML = message.replace(/\n/g, "<br>");

  conf.innerHTML = "";
  const colors = ["#FF7FB1", "#FFD7E9", "#FFD98F", "#C9879A", "#B56576", "#F4B0CB"];
  for (let i = 0; i < 24; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = 10 + Math.random() * 80 + "%";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = 1.2 + Math.random() * 1.6 + "s";
    el.style.top = -20 - Math.random() * 40 + "px";
    conf.appendChild(el);
  }

  cel.classList.remove("hidden");
}

  function bindCelebrationClose() {
    const btn = document.getElementById("celebrationClose");
    if (btn)
      btn.addEventListener("click", () => {
        const cel = document.getElementById("celebrationModal");
        if (cel) cel.classList.add("hidden");
      });
  }

  /* ---------- Ortak init ---------- */
  function initCommon() {
    const howBtn = document.getElementById("howItWorks");
    if (howBtn)
      howBtn.addEventListener("click", () =>
        showMessage("info", "Planını seç: Tamamen şekersiz veya İzinli. Sonra ilgili sayfaya yönlendirilirsin.")
      );
    bindCelebrationClose();
  }

  /* ---------- Index ---------- */
  function initIndex() {
    document.querySelectorAll(".plan-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const plan = btn.dataset.plan;
        localStorage.setItem("abur_cubur_plan", plan);
        if (plan === "saf") window.location.href = "saf.html";
        else window.location.href = "izinli.html";
      });
    });
  }

  /* ================= SAF (Tamamen Şekersiz) ================= */
  function initSaf() {
    const storageKey = "saf_calendar_v1";
    const celebratedKey = "saf_celebrated_months";
    let state = JSON.parse(localStorage.getItem(storageKey) || "{}");
    let celebrated = JSON.parse(localStorage.getItem(celebratedKey) || "[]");

    let viewDate = new Date();
    let viewYear = viewDate.getFullYear();
    let viewMonth = viewDate.getMonth();

    const calEl = document.getElementById("safCalendar");
    const prevBtn = document.getElementById("prevMonth");
    const nextBtn = document.getElementById("nextMonth");
    const monthTitle = document.getElementById("monthTitle");
    const completeBtn = document.getElementById("completeMonthBtn");
    const resetBtn = document.getElementById("safReset");

    if (!calEl || !monthTitle) return;

    function save() {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
    function saveCelebrated() {
      localStorage.setItem(celebratedKey, JSON.stringify(celebrated));
    }

    function render() {
      const titleDate = new Date(viewYear, viewMonth, 1);
      monthTitle.textContent = titleDate.toLocaleString("tr-TR", {
        month: "long",
        year: "numeric",
      });

      calEl.innerHTML = "";
      const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
      weekdays.forEach((w) => {
        const h = document.createElement("div");
        h.className = "day header weekday";
        h.textContent = w;
        calEl.appendChild(h);
      });

      const first = new Date(viewYear, viewMonth, 1);
      const last = new Date(viewYear, viewMonth + 1, 0);
      const pad = (first.getDay() + 6) % 7;
      const prevLast = new Date(viewYear, viewMonth, 0).getDate();
      for (let i = pad - 1; i >= 0; i--) {
        const dnum = prevLast - i;
        const el = document.createElement("div");
        el.className = "day other-month";
        el.innerHTML = `<div class="date">${dnum}</div>`;
        calEl.appendChild(el);
      }

      const todayKey = isoToday();
      for (let d = 1; d <= last.getDate(); d++) {
        const dt = new Date(viewYear, viewMonth, d);
        const dayKey = formatYMD(dt);
        const el = document.createElement("div");
        el.className = "day";
        if (dayKey === todayKey) el.classList.add("today");

        if (state[dayKey] && state[dayKey].noSugar) el.classList.add("succ");
        if (state[dayKey] && state[dayKey].hadSugar) el.classList.add("fail");

        if (isPast(dayKey)) {
          el.classList.add("locked");
        } else {
          el.addEventListener("click", () => {
            const rec = state[dayKey] || { noSugar: false, hadSugar: false };
            if (!rec.noSugar && !rec.hadSugar) rec.noSugar = true;
            else if (rec.noSugar) {
              rec.noSugar = false;
              rec.hadSugar = true;
            } else {
              rec.noSugar = false;
              rec.hadSugar = false;
            }
            if (rec.noSugar || rec.hadSugar) state[dayKey] = rec;
            else delete state[dayKey];
            save();
            render();
          });
        }

        const dateDiv = document.createElement("div");
        dateDiv.className = "date";
        dateDiv.textContent = d;
        el.insertBefore(dateDiv, el.firstChild);
        calEl.appendChild(el);
      }

      const total = calEl.children.length;
      const rem = (7 - (total % 7)) % 7;
      for (let i = 0; i < rem; i++) {
        const el = document.createElement("div");
        el.className = "day other-month";
        calEl.appendChild(el);
      }
    }

    // Ay'ı tamamla
    if (completeBtn) {
        completeBtn.addEventListener("click", () => {
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            let noSugarCount = 0;
            let hadSugarCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
            const key = formatYMD(new Date(viewYear, viewMonth, d));
            const rec = state[key];
            if (rec?.noSugar) noSugarCount++;
            if (rec?.hadSugar) hadSugarCount++;
            }

            const stats = `Bu ay ${daysInMonth} günün:
                            ✅ ${noSugarCount} gününde şeker YEMEDİN,
                            ❌ ${hadSugarCount} gününde şeker YEDİN.`;

            const monthId = `saf-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
            if (!celebrated.includes(monthId)) {
            celebrated.push(monthId);
            saveCelebrated();
            }

            showCelebration(`🎉 Ay tamamlandı!\n\n${stats}`);
        });
    }

    if (prevBtn)
      prevBtn.addEventListener("click", () => {
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        render();
      });
    if (nextBtn)
      nextBtn.addEventListener("click", () => {
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        render();
      });

    if (resetBtn)
      resetBtn.addEventListener("click", async () => {
        const ok = await showConfirm("warning", "Bu ayın tüm işaretlerini silmek istiyor musun?", "Evet, sil", "Vazgeç");
        if (!ok) return;
        const days = new Date(viewYear, viewMonth + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const k = formatYMD(new Date(viewYear, viewMonth, d));
          if (state[k]) delete state[k];
        }
        save();
        render();
        showMessage("success", "Bu ay sıfırlandı.");
      });

    render();
  }

  /* ================= İZİNLİ (Kontrollü) ================= */
  function initIzinli() {
    const storageKey = "izinli_state_v5"; // v5: pencere denetimi + mesaj UI
    const celebratedKey = "izinli_celebrated_months";
    let st = JSON.parse(localStorage.getItem(storageKey) || "null");
    let celebrated = JSON.parse(localStorage.getItem(celebratedKey) || "[]");

    const defaults = {
      allowances: {
        dondurma: { name: "Dondurma", limit: 3, period_days: 7 },
        cikolata: { name: "Çikolata", limit: 1, period_days: 7 },
        cips: { name: "Cips", limit: 1, period_days: 14 },
      },
      calendar: {},
      history: [],
    };
    if (!st) {
      st = JSON.parse(JSON.stringify(defaults));
      localStorage.setItem(storageKey, JSON.stringify(st));
    }

    let viewDate = new Date();
    let viewYear = viewDate.getFullYear();
    let viewMonth = viewDate.getMonth();

    const calEl = document.getElementById("izinliCalendar");
    const weekAllowanceEl = document.getElementById("weekAllowance");
    const paletteEl = document.getElementById("stickerPalette");
    const clearSelBtn = document.getElementById("clearSelection");
    const currentSelectionEl = document.getElementById("currentSelection");
    const prevBtn = document.getElementById("prevMonth");
    const nextBtn = document.getElementById("nextMonth");
    const monthTitle = document.getElementById("monthTitle");
    const finishBtn = document.getElementById("finishMonthBtn");

    if (!calEl || !weekAllowanceEl || !paletteEl || !monthTitle) return;

    function save() {
      localStorage.setItem(storageKey, JSON.stringify(st));
    }
    function saveCelebrated() {
      localStorage.setItem(celebratedKey, JSON.stringify(celebrated));
    }

    // Belirli aralıkta belirtilen türden toplam kullanımı say
    function countBetween(startDateStr, endDateStr, type) {
      let count = 0;
      const start = parseYMD(startDateStr);
      const end = parseYMD(endDateStr);
      Object.entries(st.calendar).forEach(([k, arr]) => {
        const d = parseYMD(k);
        if (d >= start && d <= end && Array.isArray(arr)) {
          arr.forEach((x) => {
            if (x === type) count++;
          });
        }
      });
      return count;
    }

    /* ------- Ayı bitir: haftalık/14 günlük pencereleri tek tek kontrol ------- */
    function checkMonthlyWindows(year, month) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const violations = []; // {name, windowStart, windowEnd, used, limit}

      Object.keys(st.allowances).forEach((key) => {
        const a = st.allowances[key];
        const p = a.period_days;

        // Pencereler haftalıkta her Pazartesi başlar (14 günlükte de Pazartesi bazlı bloklar)
        let winStart = mondayOf(monthStart);
        while (winStart <= monthEnd) {
          const winEnd = new Date(winStart);
          winEnd.setDate(winStart.getDate() + p - 1);

          // Ay içi kesişimi al
          const rangeStart = winStart < monthStart ? monthStart : winStart;
          const rangeEnd = winEnd > monthEnd ? monthEnd : winEnd;

          const used = countBetween(formatYMD(rangeStart), formatYMD(rangeEnd), a.name);
          if (used > a.limit) {
            violations.push({
              name: a.name,
              windowStart: new Date(winStart),
              windowEnd: new Date(winEnd),
              used,
              limit: a.limit,
            });
          }

          // Sonraki pencere
          winStart = new Date(winStart);
          winStart.setDate(winStart.getDate() + p);
        }
      });

      return violations;
    }

    /* ------- Üstte (bu hafta) kalan hakların görselleştirilmesi ------- */
    function renderWeekAllowance() {
      weekAllowanceEl.innerHTML = "";
      const today = new Date();
      const monday = mondayOf(today);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const startStr = formatYMD(monday);
      const endStr = formatYMD(sunday);

      Object.keys(st.allowances).forEach((k) => {
        const a = st.allowances[k];
        const used = countBetween(startStr, endStr, a.name);
        const remaining = Math.max(0, a.limit - used);

        const block = document.createElement("div");
        block.className = "allow-block";

        const left = document.createElement("div");
        left.innerHTML = `<strong>${a.name}</strong><br><small>${used}/${a.limit} bu hafta</small>`;

        const icons = document.createElement("div");
        icons.className = "allow-icons";
        for (let i = 0; i < a.limit; i++) {
          const img = createIconImg(k, "sticker small");
          img.style.opacity = i < remaining ? "1" : "0.25";
          icons.appendChild(img);
        }

        block.appendChild(left);
        block.appendChild(icons);
        weekAllowanceEl.appendChild(block);
      });
    }

    function renderPalette() {
      // eski dinamikleri temizle
      Array.from(paletteEl.querySelectorAll(".palette-item")).forEach((n) => n.remove());
      Object.keys(st.allowances).forEach((k) => {
        const item = document.createElement("div");
        item.className = "palette-item";
        const img = createIconImg(k, "sticker small");
        const txt = document.createElement("div");
        txt.style.fontWeight = "600";
        txt.style.marginLeft = "6px";
        txt.textContent = st.allowances[k].name;

        item.appendChild(img);
        item.appendChild(txt);
        item.addEventListener("click", () => {
          const prev = paletteEl.querySelector(".palette-item.selected");
          if (prev) prev.classList.remove("selected");
          if (window.selectedKey === k) {
            window.selectedKey = null;
            currentSelectionEl.textContent = "";
          } else {
            window.selectedKey = k;
            item.classList.add("selected");
            currentSelectionEl.textContent = "Seçili: " + st.allowances[k].name;
          }
        });

        paletteEl.insertBefore(item, clearSelBtn);
      });

      clearSelBtn.addEventListener("click", () => {
        window.selectedKey = null;
        const prev = paletteEl.querySelector(".palette-item.selected");
        if (prev) prev.classList.remove("selected");
        currentSelectionEl.textContent = "";
      });
    }

    function render() {
      const titleDate = new Date(viewYear, viewMonth, 1);
      monthTitle.textContent = titleDate.toLocaleString("tr-TR", {
        month: "long",
        year: "numeric",
      });

      calEl.innerHTML = "";

      const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
      weekdays.forEach((w) => {
        const h = document.createElement("div");
        h.className = "day header weekday";
        h.textContent = w;
        calEl.appendChild(h);
      });

      const first = new Date(viewYear, viewMonth, 1);
      const last = new Date(viewYear, viewMonth + 1, 0);
      const pad = (first.getDay() + 6) % 7;
      const prevLast = new Date(viewYear, viewMonth, 0).getDate();
      for (let i = pad - 1; i >= 0; i--) {
        const dnum = prevLast - i;
        const el = document.createElement("div");
        el.className = "day other-month";
        el.innerHTML = `<div class="date">${dnum}</div>`;
        calEl.appendChild(el);
      }

      const todayKey = isoToday();
      for (let d = 1; d <= last.getDate(); d++) {
        const dt = new Date(viewYear, viewMonth, d);
        const dayKey = formatYMD(dt);
        const el = document.createElement("div");
        el.className = "day";
        if (dayKey === todayKey) el.classList.add("today");
        if (isPast(dayKey)) el.classList.add("locked");

        // mevcut sticker'lar
        const rec = st.calendar[dayKey];
        if (Array.isArray(rec) && rec.length) {
          const wrap = document.createElement("div");
          wrap.style.marginTop = "6px";
          rec.forEach((name) => {
            const img = document.createElement("img");
            img.className = "sticker";
            const key = Object.keys(st.allowances).find((k) => st.allowances[k].name === name);
            img.src = key ? `images/${key}.png` : "";
            img.onerror = function () {
              img.onerror = null;
              if (key) img.src = `images/${key}.svg`;
            };
            img.alt = name;
            img.title = name;
            wrap.appendChild(img);
          });
          el.appendChild(wrap);
        }

        el.addEventListener("click", async () => {
          if (isPast(dayKey)) {
            showMessage("error", "Bu gün kilitli. Geçmişte değişiklik yapamazsın.");
            return;
          }
          const sel = window.selectedKey || null;
          if (sel) {
            const a = st.allowances[sel];
            // haftalık pencere (Mon-Sun) kullanımı
            const monday = mondayOf(dt);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const used = countBetween(formatYMD(monday), formatYMD(sunday), a.name);
            if (used >= a.limit) {
              const ok = await showConfirm(
                "warning",
                `${a.name} için bu hafta hakkın dolmuş. Yine de eklemek istiyor musun?`,
                "Evet, ekle",
                "Vazgeç"
              );
              if (!ok) return;
            }
            st.calendar[dayKey] = st.calendar[dayKey] || [];
            st.calendar[dayKey].push(a.name);
            st.history.unshift({ date: dayKey, type: a.name });
            if (st.history.length > 300) st.history.pop();
            save();
            render();
            renderWeekAllowance();
            currentSelectionEl.textContent = "Seçili: " + a.name + " (eklendi)";
            setTimeout(() => {
              currentSelectionEl.textContent = "Seçili: " + a.name;
            }, 700);
            return;
          }
          // seçim yoksa modal aç ve ekle/kaldır
          openModalForDay(dayKey);
        });

        const dateDiv = document.createElement("div");
        dateDiv.className = "date";
        dateDiv.textContent = d;
        el.insertBefore(dateDiv, el.firstChild);
        calEl.appendChild(el);
      }

      const total = calEl.children.length;
      const rem = (7 - (total % 7)) % 7;
      for (let i = 0; i < rem; i++) {
        const el = document.createElement("div");
        el.className = "day other-month";
        calEl.appendChild(el);
      }
    }

    function openModalForDay(dayKey) {
      const modal = document.getElementById("modal");
      const body = document.getElementById("modalBody");
      body.innerHTML = "";

      const h = document.createElement("h3");
      h.textContent = dayKey + " — İzin Yönetimi";
      body.appendChild(h);

      const existing = st.calendar[dayKey] || [];
      const list = document.createElement("div");
      list.style.marginTop = "8px";

      if (existing.length === 0) {
        const no = document.createElement("div");
        no.className = "muted";
        no.textContent = "Bu güne eklenmiş sticker yok.";
        list.appendChild(no);
      } else {
        existing.forEach((name, idx) => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.marginBottom = "8px";

          const left = document.createElement("div");
          left.style.display = "flex";
          left.style.alignItems = "center";
          left.style.gap = "8px";

          const img = document.createElement("img");
          img.className = "sticker small";
          const key = Object.keys(st.allowances).find((k) => st.allowances[k].name === name);
          img.src = key ? `images/${key}.png` : "";
          img.onerror = function () {
            img.onerror = null;
            if (key) img.src = `images/${key}.svg`;
          };

          left.appendChild(img);
          left.appendChild(document.createTextNode(name));

          const right = document.createElement("div");
          const btn = document.createElement("button");
          btn.className = "pill ghost";
          btn.textContent = "Kaldır";
          btn.addEventListener("click", () => {
            st.calendar[dayKey].splice(idx, 1);
            if (st.calendar[dayKey].length === 0) delete st.calendar[dayKey];
            save();
            render();
            renderWeekAllowance();
            openModalForDay(dayKey);
          });

          right.appendChild(btn);
          row.appendChild(left);
          row.appendChild(right);
          list.appendChild(row);
        });
      }
      body.appendChild(list);

      const addArea = document.createElement("div");
      addArea.style.marginTop = "12px";
      Object.keys(st.allowances).forEach((k) => {
        const a = st.allowances[k];
        const btn = document.createElement("button");
        btn.className = "pill";
        btn.style.margin = "6px";
        btn.textContent = "Ekle: " + a.name;
        btn.addEventListener("click", async () => {
          const monday = mondayOf(parseYMD(dayKey));
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          const used = countBetween(formatYMD(monday), formatYMD(sunday), a.name);
          if (used >= a.limit) {
            const ok = await showConfirm(
              "warning",
              `${a.name} için bu hafta hakkın dolmuş. Yine de eklemek istiyor musun?`,
              "Evet, ekle",
              "Vazgeç"
            );
            if (!ok) return;
          }
          st.calendar[dayKey] = st.calendar[dayKey] || [];
          st.calendar[dayKey].push(a.name);
          st.history.unshift({ date: dayKey, type: a.name });
          if (st.history.length > 300) st.history.pop();
          save();
          render();
          renderWeekAllowance();
          openModalForDay(dayKey);
        });
        addArea.appendChild(btn);
      });
      body.appendChild(addArea);

      modal.classList.remove("hidden");
      const modalCloseBtn = document.getElementById("modalClose");
      if (modalCloseBtn) modalCloseBtn.onclick = () => modal.classList.add("hidden");
    }

    // Ayı bitir
    if (finishBtn) {
        finishBtn.addEventListener("click", () => {
            const violations = checkMonthlyWindows(viewYear, viewMonth);
            let message = `🍦 İzinli Plan — ${viewYear}/${viewMonth + 1}\n\n`;

            Object.keys(st.allowances).forEach((key) => {
            const a = st.allowances[key];

            let total = 0;
            Object.values(st.calendar).forEach((arr) => {
                if (Array.isArray(arr)) {
                arr.forEach((name) => {
                    if (name === a.name) total++;
                });
                }
            });
            message += `• ${a.name}: ${total} kez\n`;
            });

            if (violations.length) {
            message += `\n⚠️ Sınır aşımları:\n`;
            violations.forEach((v) => {
                const ws = v.windowStart.toLocaleDateString("tr-TR");
                const we = v.windowEnd.toLocaleDateString("tr-TR");
                message += `- ${v.name} (${ws} - ${we}) aralığında ${v.used}/${v.limit}\n`;
            });
            } else {
            message += `\n👏 Tebrikler! Bu ay sınırları aşmadın.`;
            }

            const monthId = `izinli-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
            if (!celebrated.includes(monthId)) {
            celebrated.push(monthId);
            saveCelebrated();
            }

            showCelebration(message);
        });
    }


    if (prevBtn)
      prevBtn.addEventListener("click", () => {
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        render();
      });
    if (nextBtn)
      nextBtn.addEventListener("click", () => {
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        render();
      });

    const resetBtn = document.getElementById("izinliReset");
    if (resetBtn)
      resetBtn.addEventListener("click", async () => {
        const ok = await showConfirm("warning", "Tüm periyotları sıfırlamak istiyor musun?", "Evet, sıfırla", "Vazgeç");
        if (!ok) return;
        st.calendar = {};
        st.history = [];
        save();
        render();
        renderWeekAllowance();
        showMessage("success", "Periyotlar sıfırlandı.");
      });

    // İlk çizimler
    window.selectedKey = null;
    renderPalette();
    renderWeekAllowance();
    render();
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initCommon();
    if (page === "index") initIndex();
    if (page === "saf") initSaf();
    if (page === "izinli") initIzinli();
  });
})();

