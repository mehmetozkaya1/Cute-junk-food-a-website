// js/script.js - Güncelleme: month navigation, safe month-complete, izinli finish-month, timezone fix, past-day lock
(function(){
  const page = document.body.dataset.page || 'index';

  // parse YYYY-MM-DD as local date (avoid UTC shift)
  function parseYMD(ymd){
    const [y,m,d] = ymd.split('-').map(Number);
    return new Date(y, m-1, d, 0,0,0,0);
  }
  function formatYMD(date){
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function isoToday(){ return formatYMD(new Date()); }
  function todayDateOnly(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
  function isPast(dayKey){
    const d = parseYMD(dayKey);
    return d < todayDateOnly();
  }

  function mondayOf(date){
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0,0,0,0);
    return d;
  }

  function createIconImg(key, cls){
    const img = document.createElement('img');
    if(cls) img.className = cls;
    img.src = `images/${key}.png`;
    img.onerror = function(){ img.onerror = null; img.src = `images/${key}.svg`; };
    return img;
  }

  // celebration helpers
  function showCelebration(message){
    const cel = document.getElementById('celebrationModal');
    const msg = document.getElementById('celebrationMessage');
    const conf = document.getElementById('confettiContainer');
    if(!cel || !msg || !conf) return;
    msg.textContent = message;
    conf.innerHTML = '';
    const colors = ['#FF7FB1','#FFD7E9','#FFD98F','#C9879A','#B56576','#F4B0CB'];
    for(let i=0;i<24;i++){
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = (10 + Math.random()*80) + '%';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.animationDuration = (1.2 + Math.random()*1.6) + 's';
      el.style.top = (-20 - Math.random()*40) + 'px';
      conf.appendChild(el);
    }
    cel.classList.remove('hidden');
    setTimeout(()=>{ cel.classList.add('hidden'); conf.innerHTML=''; }, 3200);
  }
  function bindCelebrationClose(){ const btn=document.getElementById('celebrationClose'); if(btn) btn.addEventListener('click', ()=>{ const cel=document.getElementById('celebrationModal'); if(cel) cel.classList.add('hidden'); }); }

  // Common init
  function initCommon(){
    const howBtn = document.getElementById('howItWorks');
    if(howBtn) howBtn.addEventListener('click', ()=> alert('Seç: Tamamen şekersiz veya İzinli. Seçtikten sonra ilgili sayfaya yönlendirilirsiniz.'));
    bindCelebrationClose();
  }

  // INDEX unchanged
  function initIndex(){
    document.querySelectorAll('.plan-card').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const plan = btn.dataset.plan;
        localStorage.setItem('abur_cubur_plan', plan);
        if(plan === 'saf') window.location.href = 'saf.html';
        else window.location.href = 'izinli.html';
      });
    });
  }

  /* ---------------- SAF PAGE ---------------- */
  function initSaf(){
    const storageKey = 'saf_calendar_v1';
    const celebratedKey = 'saf_celebrated_months';
    let state = JSON.parse(localStorage.getItem(storageKey) || '{}');
    let celebrated = JSON.parse(localStorage.getItem(celebratedKey) || '[]');

    // view controls
    let viewDate = new Date(); // default current month view
    let viewYear = viewDate.getFullYear();
    let viewMonth = viewDate.getMonth(); // 0-based

    const calEl = document.getElementById('safCalendar');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const monthTitle = document.getElementById('monthTitle');
    const completeBtn = document.getElementById('completeMonthBtn');

    if(!calEl || !monthTitle) return;

    function save(){ localStorage.setItem(storageKey, JSON.stringify(state)); }
    function saveCelebrated(){ localStorage.setItem(celebratedKey, JSON.stringify(celebrated)); }

    function render(){
      // set title
      const titleDate = new Date(viewYear, viewMonth, 1);
      monthTitle.textContent = titleDate.toLocaleString('tr-TR', { month:'long', year:'numeric' });

      calEl.innerHTML = '';
      // weekdays
      const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
      weekdays.forEach(w => { const h=document.createElement('div'); h.className='day header weekday'; h.textContent = w; calEl.appendChild(h); });

      const first = new Date(viewYear, viewMonth, 1);
      const last = new Date(viewYear, viewMonth+1, 0);
      const pad = (first.getDay()+6)%7;
      const prevLast = new Date(viewYear, viewMonth, 0).getDate();
      for(let i=pad-1;i>=0;i--){ const dnum = prevLast - i; const el = document.createElement('div'); el.className='day other-month'; el.innerHTML=`<div class="date">${dnum}</div>`; calEl.appendChild(el); }

      const todayKey = isoToday();
      for(let d=1; d<=last.getDate(); d++){
        const dt = new Date(viewYear, viewMonth, d);
        const dayKey = formatYMD(dt);
        const el = document.createElement('div'); el.className='day';
        if(dayKey === todayKey) el.classList.add('today');

        // show saved classes
        if(state[dayKey] && state[dayKey].noSugar) el.classList.add('succ');
        if(state[dayKey] && state[dayKey].hadSugar) el.classList.add('fail');

        // lock past days relative to *today*
        if(isPast(dayKey)){
          el.classList.add('locked');
          // keep appearance but no click
        } else {
          el.addEventListener('click', ()=>{
            // toggle only for today/future
            const rec = state[dayKey] || { noSugar:false, hadSugar:false };
            if(!rec.noSugar && !rec.hadSugar) rec.noSugar = true;
            else if(rec.noSugar){ rec.noSugar = false; rec.hadSugar = true; }
            else { rec.noSugar = false; rec.hadSugar = false; }
            if(rec.noSugar || rec.hadSugar) state[dayKey] = rec;
            else delete state[dayKey];
            save();
            render(); // refresh to apply classes (simple)
          });
        }

        const dateDiv = document.createElement('div'); dateDiv.className='date'; dateDiv.textContent = d;
        el.insertBefore(dateDiv, el.firstChild);
        calEl.appendChild(el);
      }

      // trailing cells
      const total = calEl.children.length;
      const rem = (7 - (total % 7)) % 7;
      for(let i=0;i<rem;i++){ const el = document.createElement('div'); el.className='day other-month'; calEl.appendChild(el); }
    }

    // prev/next handlers
    if(prevBtn) prevBtn.addEventListener('click', ()=>{ viewMonth--; if(viewMonth<0){ viewMonth=11; viewYear--; } render(); });
    if(nextBtn) nextBtn.addEventListener('click', ()=>{ viewMonth++; if(viewMonth>11){ viewMonth=0; viewYear++; } render(); });

    // complete month button handler
    if(completeBtn){
      completeBtn.addEventListener('click', ()=>{
        // compute stats for viewYear/viewMonth
        const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
        let noSugarCount = 0;
        for(let d=1; d<=daysInMonth; d++){
          const key = formatYMD(new Date(viewYear, viewMonth, d));
          if(state[key] && state[key].noSugar) noSugarCount++;
        }
        // show stats always
        const msg = `Bu ay ${daysInMonth} günün ${noSugarCount} gününde şeker yememişsin.`;
        if(noSugarCount === daysInMonth){
          // celebrate and save
          const monthId = `saf-${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
          if(!celebrated.includes(monthId)){
            celebrated.push(monthId);
            saveCelebrated();
          }
          showCelebration(`🏆 Harika! ${new Date(viewYear, viewMonth, 1).toLocaleString('tr-TR',{month:'long',year:'numeric'})} ayını tamamen şekersiz tamamladın!\n\n${msg}`);
        } else {
          alert(`Ay tamamlanamıyor: ${msg}\nTüm günleri 'şekersiz' işaretlemeden kutlama alamazsın.`);
        }
      });
    }

    // reset month (current view)
    const resetBtn = document.getElementById('safReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      if(!confirm('Bu ayın tüm işaretlerini silmek istiyor musun?')) return;
      // delete keys of current view month
      const days = new Date(viewYear, viewMonth+1, 0).getDate();
      for(let d=1; d<=days; d++){ const k = formatYMD(new Date(viewYear, viewMonth, d)); if(state[k]) delete state[k]; }
      save(); render();
    });

    render();
    // no automatic celebration check anymore — only manual via button
  }

  /* -------------- IZINLI PAGE -------------- */
  function initIzinli(){
    const storageKey = 'izinli_state_v4';
    const celebratedKey = 'izinli_celebrated_months';
    let st = JSON.parse(localStorage.getItem(storageKey) || 'null');
    let celebrated = JSON.parse(localStorage.getItem(celebratedKey) || '[]');

    const defaults = {
      allowances: {
        dondurma: { name:'Dondurma', limit:3, period_days:7 },
        cikolata: { name:'Çikolata', limit:1, period_days:7 },
        cips: { name:'Cips', limit:1, period_days:14 }
      },
      calendar: {},
      history: []
    };
    if(!st){ st = JSON.parse(JSON.stringify(defaults)); localStorage.setItem(storageKey, JSON.stringify(st)); }

    // view state
    let viewDate = new Date(); let viewYear = viewDate.getFullYear(); let viewMonth = viewDate.getMonth();

    const calEl = document.getElementById('izinliCalendar');
    const weekAllowanceEl = document.getElementById('weekAllowance');
    const paletteEl = document.getElementById('stickerPalette');
    const clearSelBtn = document.getElementById('clearSelection');
    const currentSelectionEl = document.getElementById('currentSelection');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const monthTitle = document.getElementById('monthTitle');
    const finishBtn = document.getElementById('finishMonthBtn');

    if(!calEl || !weekAllowanceEl || !paletteEl || !monthTitle) return;

    function save(){ localStorage.setItem(storageKey, JSON.stringify(st)); }
    function saveCelebrated(){ localStorage.setItem(celebratedKey, JSON.stringify(celebrated)); }

    // counts of given type between two dates
    function countBetween(startDateStr, endDateStr, type){
      let count = 0;
      const start = parseYMD(startDateStr);
      const end = parseYMD(endDateStr);
      Object.entries(st.calendar).forEach(([k, arr])=>{
        const d = parseYMD(k);
        if(d >= start && d <= end && Array.isArray(arr)){
          arr.forEach(x => { if(x === type) count++; });
        }
      });
      return count;
    }

    function renderPalette(){
      // remove previous dynamic items
      Array.from(paletteEl.querySelectorAll('.palette-item')).forEach(n=>n.remove());
      Object.keys(st.allowances).forEach(k=>{
        const item = document.createElement('div'); item.className='palette-item';
        const img = createIconImg(k, 'sticker small');
        item.appendChild(img);
        const txt = document.createElement('div'); txt.style.fontWeight='600'; txt.style.marginLeft='6px'; txt.textContent = st.allowances[k].name;
        item.appendChild(txt);
        item.addEventListener('click', ()=>{
          const prev = paletteEl.querySelector('.palette-item.selected');
          if(prev) prev.classList.remove('selected');
          if(window.selectedKey === k){ window.selectedKey = null; currentSelectionEl.textContent=''; }
          else { window.selectedKey = k; item.classList.add('selected'); currentSelectionEl.textContent = 'Seçili: ' + st.allowances[k].name; }
        });
        paletteEl.insertBefore(item, clearSelBtn);
      });
      clearSelBtn.addEventListener('click', ()=>{
        window.selectedKey = null;
        const prev = paletteEl.querySelector('.palette-item.selected');
        if(prev) prev.classList.remove('selected');
        currentSelectionEl.textContent = '';
      });
    }

    function renderWeekAllowance(){
      weekAllowanceEl.innerHTML = '';
      const today = new Date();
      const monday = mondayOf(today);
      const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
      const startStr = formatYMD(monday);
      const endStr = formatYMD(sunday);
      Object.keys(st.allowances).forEach(k=>{
        const a = st.allowances[k];
        const used = countBetween(startStr, endStr, a.name);
        const remaining = Math.max(0, a.limit - used);
        const block = document.createElement('div'); block.className='allow-block';
        const left = document.createElement('div'); left.innerHTML = `<strong>${a.name}</strong><br><small>${used}/${a.limit} bu hafta</small>`;
        const icons = document.createElement('div'); icons.className = 'allow-icons';
        for(let i=0;i<a.limit;i++){
          const img = createIconImg(k, 'sticker small');
          img.style.opacity = (i < remaining) ? '1' : '0.25';
          icons.appendChild(img);
        }
        block.appendChild(left); block.appendChild(icons); weekAllowanceEl.appendChild(block);
      });
    }

    function render(){
      // month title
      const titleDate = new Date(viewYear, viewMonth, 1);
      monthTitle.textContent = titleDate.toLocaleString('tr-TR', { month:'long', year:'numeric' });

      calEl.innerHTML = '';
      const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
      weekdays.forEach(w=>{ const h=document.createElement('div'); h.className='day header weekday'; h.textContent=w; calEl.appendChild(h); });

      const first = new Date(viewYear, viewMonth, 1);
      const last = new Date(viewYear, viewMonth+1, 0);
      const pad = (first.getDay()+6)%7;
      const prevLast = new Date(viewYear, viewMonth, 0).getDate();
      for(let i=pad-1;i>=0;i--){ const dnum=prevLast-i; const el=document.createElement('div'); el.className='day other-month'; el.innerHTML=`<div class="date">${dnum}</div>`; calEl.appendChild(el); }

      const todayKey = isoToday();
      for(let d=1; d<=last.getDate(); d++){
        const dt = new Date(viewYear, viewMonth, d);
        const dayKey = formatYMD(dt);
        const el = document.createElement('div'); el.className='day';
        if(dayKey === todayKey) el.classList.add('today');
        if(isPast(dayKey)) el.classList.add('locked');

        // stickers
        const rec = st.calendar[dayKey];
        if(Array.isArray(rec) && rec.length){
          const wrap = document.createElement('div'); wrap.style.marginTop='6px';
          rec.forEach(name=>{
            const img = document.createElement('img'); img.className='sticker';
            const key = Object.keys(st.allowances).find(k=>st.allowances[k].name === name);
            img.src = key ? `images/${key}.png` : '';
            img.onerror = function(){ img.onerror=null; if(key) img.src = `images/${key}.svg`; };
            img.alt = name; img.title = name; wrap.appendChild(img);
          });
          el.appendChild(wrap);
        }

        el.addEventListener('click', ()=> {
          if(isPast(dayKey)){ alert('Bu gün kilitli. Geçmişte değişiklik yapılamaz.'); return; }
          const sel = window.selectedKey || null;
          if(sel){
            const a = st.allowances[sel];
            // weekly used
            const monday = mondayOf(dt);
            const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
            const used = countBetween(formatYMD(monday), formatYMD(sunday), a.name);
            if(used >= a.limit){
              if(!confirm(`${a.name} için bu hafta hakkın dolmuş. Yine de eklemek istiyor musun?`)) return;
              // allow adding anyway
            }
            st.calendar[dayKey] = st.calendar[dayKey] || [];
            st.calendar[dayKey].push(a.name);
            st.history.unshift({date: dayKey, type: a.name});
            if(st.history.length > 300) st.history.pop();
            save(); render(); renderWeekAllowance();
            currentSelectionEl.textContent = 'Seçili: ' + a.name + ' (ekledi)';
            setTimeout(()=>{ currentSelectionEl.textContent = 'Seçili: ' + a.name; }, 700);
            return;
          }
          // no selection -> open modal for add/remove (removal allowed because day is not past)
          openModalForDay(dayKey);
        });

        const dateDiv=document.createElement('div'); dateDiv.className='date'; dateDiv.textContent=d; el.insertBefore(dateDiv, el.firstChild);
        calEl.appendChild(el);
      }

      const total = calEl.children.length;
      const rem = (7 - (total % 7)) % 7;
      for(let i=0;i<rem;i++){ const el = document.createElement('div'); el.className='day other-month'; calEl.appendChild(el); }
    }

    // modal similar to earlier: openModalForDay allows removal + add (removals only if not past)
    function openModalForDay(dayKey){
      const modal = document.getElementById('modal');
      const body = document.getElementById('modalBody');
      body.innerHTML = '';
      const h = document.createElement('h3'); h.textContent = dayKey + ' — İzin Yönetimi'; body.appendChild(h);
      const existing = st.calendar[dayKey] || [];
      const list = document.createElement('div'); list.style.marginTop='8px';
      if(existing.length === 0){ const no=document.createElement('div'); no.className='muted'; no.textContent='Bu güne eklenmiş sticker yok.'; list.appendChild(no); }
      else {
        existing.forEach((name, idx)=>{
          const row=document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.justifyContent='space-between'; row.style.marginBottom='8px';
          const left = document.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='8px';
          const img=document.createElement('img'); img.className='sticker small';
          const key = Object.keys(st.allowances).find(k => st.allowances[k].name===name);
          img.src = key ? `images/${key}.png` : '';
          img.onerror = function(){ img.onerror=null; if(key) img.src=`images/${key}.svg`; };
          left.appendChild(img);
          left.appendChild(document.createTextNode(name));
          const right = document.createElement('div');
          const btn = document.createElement('button'); btn.className='pill ghost'; btn.textContent='Kaldır';
          btn.addEventListener('click', ()=>{
            // removal allowed (we already prevented opening modal for past days)
            st.calendar[dayKey].splice(idx,1);
            if(st.calendar[dayKey].length === 0) delete st.calendar[dayKey];
            save(); render(); renderWeekAllowance(); openModalForDay(dayKey);
          });
          right.appendChild(btn);
          row.appendChild(left); row.appendChild(right);
          list.appendChild(row);
        });
      }
      body.appendChild(list);

      // add area
      const addArea = document.createElement('div'); addArea.style.marginTop='12px';
      Object.keys(st.allowances).forEach(k=>{
        const a = st.allowances[k];
        const btn = document.createElement('button'); btn.className='pill'; btn.style.margin='6px'; btn.textContent = 'Ekle: ' + a.name;
        btn.addEventListener('click', ()=>{
          // weekly usage check
          const monday = mondayOf(parseYMD(dayKey));
          const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
          const used = countBetween(formatYMD(monday), formatYMD(sunday), a.name);
          if(used >= a.limit){
            if(!confirm(`${a.name} için bu hafta hakkın dolmuş. Yine de eklemek istiyor musun?`)) return;
          }
          st.calendar[dayKey] = st.calendar[dayKey] || []; st.calendar[dayKey].push(a.name);
          st.history.unshift({date: dayKey, type: a.name});
          if(st.history.length > 300) st.history.pop();
          save(); render(); renderWeekAllowance(); openModalForDay(dayKey);
        });
        addArea.appendChild(btn);
      });
      body.appendChild(addArea);

      document.getElementById('modal').classList.remove('hidden');
    }

    function closeModal(){ document.getElementById('modal').classList.add('hidden'); }
    const modalCloseBtn = document.getElementById('modalClose'); if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // prev/next month
    if(prevBtn) prevBtn.addEventListener('click', ()=>{ viewMonth--; if(viewMonth<0){ viewMonth=11; viewYear--; } render(); });
    if(nextBtn) nextBtn.addEventListener('click', ()=>{ viewMonth++; if(viewMonth>11){ viewMonth=0; viewYear++; } render(); });

    // finish month button: check month-wide rule -> celebrate if for month no allowance exceeded
    if(finishBtn) finishBtn.addEventListener('click', ()=>{
      const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
      const startStr = formatYMD(new Date(viewYear, viewMonth, 1));
      const endStr = formatYMD(new Date(viewYear, viewMonth, daysInMonth));
      // compute for each allowance total used in month and allowed threshold
      const bad = [];
      Object.keys(st.allowances).forEach(k=>{
        const a = st.allowances[k];
        const used = countBetween(startStr, endStr, a.name);
        const allowed = Math.ceil(daysInMonth / a.period_days) * a.limit;
        if(used > allowed) bad.push({name: a.name, used, allowed});
      });
      if(bad.length === 0){
        const monthId = `izinli-${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
        if(!celebrated.includes(monthId)){ celebrated.push(monthId); saveCelebrated(); }
        showCelebration(`🎉 Tebrikler! ${new Date(viewYear, viewMonth, 1).toLocaleString('tr-TR',{month:'long',year:'numeric'})} ayını sınırları aşmadan tamamladın!`);
      } else {
        let s = 'Aşağıdaki kalemler aylık izin limitini aştı:\n';
        bad.forEach(b=> s += `${b.name}: ${b.used} kullanıldı (izin: ${b.allowed})\n`);
        alert(s);
      }
    });

    // reset
    const resetBtn = document.getElementById('izinliReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      if(!confirm('Tüm periyotları sıfırlamak istiyor musun?')) return;
      st.calendar={}; st.history=[]; save(); render(); renderWeekAllowance();
    });

    // initial render
    window.selectedKey = null;
    renderPalette(); renderWeekAllowance(); render();
  }

  // boot
  document.addEventListener('DOMContentLoaded', ()=>{
    initCommon();
    if(page === 'index') initIndex();
    if(page === 'saf') initSaf();
    if(page === 'izinli') initIzinli();
  });
})();
