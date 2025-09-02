(function(){
  const page = document.body.dataset.page || 'index';
  const isoToday = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); };

  // get Monday for a date
  function mondayOf(date){ const d = new Date(date); const day = d.getDay(); const diff = (day + 6) % 7; d.setDate(d.getDate() - diff); d.setHours(0,0,0,0); return d; }

  // create <img> preferring PNG then falling back to SVG
  function createIconImg(key, cls){
    const img = document.createElement('img');
    if(cls) img.className = cls;
    img.src = `images/${key}.png`;
    img.onerror = function(){ img.onerror = null; img.src = `images/${key}.svg`; };
    return img;
  }

  // COMMON
  function initCommon(){
    const howBtn = document.getElementById('howItWorks');
    if(howBtn) howBtn.addEventListener('click', ()=> alert('Seç: Tamamen şekersiz veya İzinli. Seçtikten sonra ilgili sayfaya yönlendirilirsiniz.'));
  }

  // INDEX
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

  // SAF (aynı)
  function initSaf(){
    const key = 'saf_calendar';
    let state = JSON.parse(localStorage.getItem(key) || '{}');
    const container = document.getElementById('safCalendar');
    if(!container) return;

    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);

    container.innerHTML = '';
    const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    weekdays.forEach(w=>{
      const h = document.createElement('div'); h.className='day header weekday'; h.style.fontWeight='700'; h.style.background='transparent'; h.style.cursor='default'; h.textContent = w; container.appendChild(h);
    });

    const pad = (first.getDay()+6)%7;
    const prevLast = new Date(year, month, 0).getDate();
    for(let i = pad-1; i >= 0; i--){
      const dnum = prevLast - i;
      const el = document.createElement('div'); el.className='day other-month'; el.innerHTML = `<div class="date">${dnum}</div>`; container.appendChild(el);
    }

    const todayKey = isoToday();
    for(let d=1; d<=last.getDate(); d++){
      const date = new Date(year, month, d);
      const dayKey = date.toISOString().slice(0,10);
      const el = document.createElement('div'); el.className='day';
      if(dayKey === todayKey) el.classList.add('today');
      const dateDiv = document.createElement('div'); dateDiv.className='date'; dateDiv.textContent = d;
      el.appendChild(dateDiv);

      if(state[dayKey] && state[dayKey].noSugar) el.classList.add('succ');
      if(state[dayKey] && state[dayKey].hadSugar) el.classList.add('fail');

      el.addEventListener('click', ()=>{
        const rec = state[dayKey] || { noSugar:false, hadSugar:false };
        if(!rec.noSugar && !rec.hadSugar) rec.noSugar = true;
        else if(rec.noSugar){ rec.noSugar = false; rec.hadSugar = true; }
        else { rec.noSugar = false; rec.hadSugar = false; }

        if(rec.noSugar || rec.hadSugar) state[dayKey] = rec;
        else delete state[dayKey];

        localStorage.setItem(key, JSON.stringify(state));
        el.classList.toggle('succ', rec.noSugar);
        el.classList.toggle('fail', rec.hadSugar);
      });

      container.appendChild(el);
    }

    const totalCells = container.children.length;
    const rem = (7 - (totalCells % 7)) % 7;
    for(let i=0;i<rem;i++){ const el = document.createElement('div'); el.className='day other-month'; container.appendChild(el); }

    const resetBtn = document.getElementById('safReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      if(!confirm('Bu ayın tüm işaretlerini silmek istiyor musun?')) return;
      for(let d=1; d<=last.getDate(); d++){
        const keyd = new Date(year, month, d).toISOString().slice(0,10);
        if(state[keyd]) delete state[keyd];
      }
      localStorage.setItem(key, JSON.stringify(state));
      location.reload();
    });
  }

  // IZINLI (gelişmiş)
  function initIzinli(){
    const storageKey = 'izinli_state_v3';
    let st = JSON.parse(localStorage.getItem(storageKey) || 'null');

    const defaults = {
      allowances: {
        dondurma: { name:'Dondurma', limit:3, period_days:7 },
        cikolata: { name:'Çikolata', limit:1, period_days:7 },
        cips: { name:'Cips', limit:1, period_days:14 }
      },
      calendar: {}, // { '2025-09-02': ['Dondurma','Cips'] }
      history: []
    };

    if(!st){ st = JSON.parse(JSON.stringify(defaults)); localStorage.setItem(storageKey, JSON.stringify(st)); }

    const calEl = document.getElementById('izinliCalendar');
    const weekAllowanceEl = document.getElementById('weekAllowance');
    const paletteEl = document.getElementById('stickerPalette');
    const clearSelBtn = document.getElementById('clearSelection');
    const currentSelectionEl = document.getElementById('currentSelection');
    let selectedKey = null; // seçili sticker key (dondurma / cikolata / cips)

    if(!calEl || !weekAllowanceEl || !paletteEl) return;

    // count uses of 'type' between start and end
    function countBetween(startDateStr, endDateStr, type){
      let count = 0;
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      Object.entries(st.calendar).forEach(([k, arr])=>{
        const d = new Date(k);
        if(d >= start && d <= end && Array.isArray(arr)){
          arr.forEach(x => { if(x === type) count++; });
        }
      });
      return count;
    }

    // save helper
    function save(){ localStorage.setItem(storageKey, JSON.stringify(st)); }

    // render palette items
    function renderPalette(){
      // clear previous icons (but keep clear button and currentSelection)
      // remove all child nodes except clearSelection and currentSelection placeholders
      // We'll append icons before the clearSelection button
      // ensure palette contains icons area
      // Build palette icons from st.allowances keys
      // Remove existing dynamic icons first
      Array.from(paletteEl.querySelectorAll('.palette-item')).forEach(n=>n.remove());

      Object.keys(st.allowances).forEach(k=>{
        const item = document.createElement('div'); item.className = 'palette-item';
        const img = createIconImg(k, 'sticker small');
        item.appendChild(img);
        const txt = document.createElement('div'); txt.style.fontWeight = '600'; txt.style.marginLeft='6px'; txt.textContent = st.allowances[k].name;
        item.appendChild(txt);

        item.addEventListener('click', ()=>{
          // toggle selection
          const prev = paletteEl.querySelector('.palette-item.selected');
          if(prev) prev.classList.remove('selected');
          if(selectedKey === k){ selectedKey = null; currentSelectionEl.textContent = ''; }
          else { selectedKey = k; item.classList.add('selected'); currentSelectionEl.textContent = 'Seçili: ' + st.allowances[k].name; }
        });

        // insert before clear button
        paletteEl.insertBefore(item, clearSelBtn);
      });

      // clear selection button behavior
      clearSelBtn.addEventListener('click', ()=>{
        selectedKey = null;
        const prev = paletteEl.querySelector('.palette-item.selected');
        if(prev) prev.classList.remove('selected');
        currentSelectionEl.textContent = '';
      });
    }

    function renderWeekAllowance(){
      weekAllowanceEl.innerHTML = '';
      const today = new Date();
      const monday = mondayOf(today);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      const startStr = monday.toISOString().slice(0,10);
      const endStr = sunday.toISOString().slice(0,10);

      Object.keys(st.allowances).forEach(k=>{
        const a = st.allowances[k];
        const used = countBetween(startStr, endStr, a.name);
        const remaining = Math.max(0, a.limit - used);

        const block = document.createElement('div'); block.className = 'allow-block';
        const left = document.createElement('div'); left.innerHTML = `<strong>${a.name}</strong><br><small>${used}/${a.limit} bu hafta</small>`;
        const icons = document.createElement('div'); icons.className = 'allow-icons';
        for(let i=0;i<a.limit;i++){
          const img = createIconImg(k, 'sticker small');
          img.style.opacity = (i < remaining) ? '1' : '0.25';
          icons.appendChild(img);
        }
        block.appendChild(left); block.appendChild(icons);
        weekAllowanceEl.appendChild(block);
      });
    }

    function renderCalendar(){
      calEl.innerHTML = '';
      const now = new Date();
      const year = now.getFullYear(), month = now.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month+1, 0);

      const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
      weekdays.forEach(w=>{ const h=document.createElement('div'); h.className='day header weekday'; h.textContent=w; calEl.appendChild(h); });

      const pad = (first.getDay()+6)%7;
      const prevLast = new Date(year, month, 0).getDate();
      for(let i = pad-1; i>=0; i--){ const dnum = prevLast - i; const el = document.createElement('div'); el.className='day other-month'; el.innerHTML = `<div class="date">${dnum}</div>`; calEl.appendChild(el); }

      const todayKey = isoToday();
      for(let d=1; d<=last.getDate(); d++){
        const date = new Date(year, month, d);
        const dayKey = date.toISOString().slice(0,10);
        const el = document.createElement('div'); el.className='day';
        if(dayKey === todayKey) el.classList.add('today');
        const dateDiv = document.createElement('div'); dateDiv.className='date'; dateDiv.textContent = d;
        el.appendChild(dateDiv);

        const rec = st.calendar[dayKey];
        if(Array.isArray(rec) && rec.length){
          const stickersWrap = document.createElement('div'); stickersWrap.style.marginTop = '6px';
          rec.forEach((name, idx) => {
            const img = document.createElement('img'); img.className = 'sticker';
            let key = Object.keys(st.allowances).find(k => st.allowances[k].name === name);
            img.src = key ? `images/${key}.png` : '';
            img.onerror = function(){ img.onerror = null; if(key) img.src = `images/${key}.svg`; };
            img.alt = name; img.title = name;
            // small remove icon overlay on hover - but removal handled in modal
            stickersWrap.appendChild(img);
          });
          el.appendChild(stickersWrap);
        }

        // click behavior: if user selected a sticker from palette, add directly; else open modal for add/remove
        el.addEventListener('click', ()=> {
          if(selectedKey){
            // try to add selectedKey respecting weekly limit
            const a = st.allowances[selectedKey];
            const monday = mondayOf(new Date(dayKey));
            const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
            const used = countBetween(monday.toISOString().slice(0,10), sunday.toISOString().slice(0,10), a.name);
            if(used >= a.limit){ alert('Bu periyotta hakkın dolmuş.'); return; }
            st.calendar[dayKey] = st.calendar[dayKey] || [];
            st.calendar[dayKey].push(a.name);
            st.history.unshift({date: dayKey, type: a.name});
            if(st.history.length > 200) st.history.pop();
            save();
            renderCalendar();
            renderWeekAllowance();
            // keep selection active (so user can add multiple quickly) — but show feedback
            currentSelectionEl.textContent = 'Seçili: ' + a.name + ' (ekledi)';
            setTimeout(()=>{ currentSelectionEl.textContent = 'Seçili: ' + a.name; }, 800);
            return;
          }
          openModalForDay(dayKey);
        });

        calEl.appendChild(el);
      }

      const totalCells = calEl.children.length;
      const rem = (7 - (totalCells % 7)) % 7;
      for(let i=0;i<rem;i++){ const el = document.createElement('div'); el.className='day other-month'; calEl.appendChild(el); }
    }

    // modal: show existing stickers with remove buttons + add buttons as fallback
    function openModalForDay(dayKey){
      const modal = document.getElementById('modal');
      const body = document.getElementById('modalBody');
      body.innerHTML = '';
      const h = document.createElement('h3'); h.textContent = dayKey + ' — İzin Yönetimi'; body.appendChild(h);
      const info = document.createElement('p'); info.textContent = 'Mevcut stickerlar: kaldırmak için Kaldır butonuna bas. Yeni eklemek için ilgili butona kullan.'; body.appendChild(info);

      // existing stickers list
      const existing = st.calendar[dayKey] || [];
      const list = document.createElement('div'); list.style.marginTop = '8px';
      if(existing.length === 0){
        const no = document.createElement('div'); no.textContent = 'Bu güne eklenmiş sticker yok.'; no.className='muted'; list.appendChild(no);
      } else {
        existing.forEach((name, idx) => {
          const row = document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.justifyContent='space-between'; row.style.gap='8px'; row.style.marginBottom='8px';
          const left = document.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='8px';
          const img = document.createElement('img'); img.className='sticker small';
          const key = Object.keys(st.allowances).find(k => st.allowances[k].name === name);
          img.src = key ? `images/${key}.png` : '';
          img.onerror = function(){ img.onerror = null; if(key) img.src = `images/${key}.svg`; };
          left.appendChild(img);
          const txt = document.createElement('div'); txt.textContent = name;
          left.appendChild(txt);
          const right = document.createElement('div');
          const btn = document.createElement('button'); btn.className='pill ghost'; btn.textContent = 'Kaldır';
          btn.addEventListener('click', ()=>{
            // remove this occurrence
            st.calendar[dayKey].splice(idx,1);
            if(st.calendar[dayKey].length === 0) delete st.calendar[dayKey];
            save();
            renderCalendar();
            renderWeekAllowance();
            // refresh modal
            openModalForDay(dayKey);
          });
          right.appendChild(btn);
          row.appendChild(left); row.appendChild(right);
          list.appendChild(row);
        });
      }
      body.appendChild(list);

      // add buttons (same as earlier) — also show limits
      const addArea = document.createElement('div'); addArea.style.marginTop = '12px';
      Object.keys(st.allowances).forEach(k=>{
        const a = st.allowances[k];
        const btn = document.createElement('button'); btn.className='pill'; btn.style.margin='6px'; btn.textContent = 'Ekle: ' + a.name;
        btn.addEventListener('click', ()=>{
          const monday = mondayOf(new Date(dayKey));
          const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
          const used = countBetween(monday.toISOString().slice(0,10), sunday.toISOString().slice(0,10), a.name);
          if(used >= a.limit){ alert('Bu periyotta hakkın dolmuş.'); return; }
          st.calendar[dayKey] = st.calendar[dayKey] || [];
          st.calendar[dayKey].push(a.name);
          st.history.unshift({date: dayKey, type: a.name});
          if(st.history.length > 200) st.history.pop();
          save();
          renderCalendar();
          renderWeekAllowance();
          openModalForDay(dayKey);
        });
        addArea.appendChild(btn);
      });
      body.appendChild(addArea);

      document.getElementById('modal').classList.remove('hidden');
    }

    function closeModal(){ document.getElementById('modal').classList.add('hidden'); }
    const modalCloseBtn = document.getElementById('modalClose');
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // reset
    const resetBtn = document.getElementById('izinliReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      if(!confirm('Tüm periyotları sıfırlamak istiyor musun?')) return;
      st.calendar = {}; st.history = [];
      save();
      renderCalendar(); renderWeekAllowance();
    });

    // initial render
    renderPalette();
    renderWeekAllowance();
    renderCalendar();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initCommon();
    if(page === 'index') initIndex();
    if(page === 'saf') initSaf();
    if(page === 'izinli') initIzinli();
  });
})();
