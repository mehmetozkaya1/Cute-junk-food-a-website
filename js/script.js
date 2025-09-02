// js/script.js
(function(){
  const page = document.body.dataset.page || 'index';

  // UTIL
  const $ = id => document.getElementById(id);
  const qsAll = sel => Array.from(document.querySelectorAll(sel));
  const isoToday = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); };

  // Common init
  function initCommon(){
    // "Nasıl Çalışır" örneği (index)
    const howBtn = document.getElementById('howItWorks');
    if(howBtn) howBtn.addEventListener('click', ()=> alert('Seç: Tamamen şekersiz veya İzinli. Seçtikten sonra ilgili sayfaya yönlendirilirsiniz.'));

    // optional: reset stored plan if user wants (not shown on UI here)
    // perform other shared bindings if needed
  }

  // INDEX page
  function initIndex(){
    qsAll('.plan-card').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const plan = btn.dataset.plan;
        // save selection
        localStorage.setItem('abur_cubur_plan', plan);
        // navigate
        if(plan === 'saf') window.location.href = 'saf.html';
        else if(plan === 'izinli') window.location.href = 'izinli.html';
        else window.location.href = 'index.html';
      });
    });
  }

  // SAF page: simple current-month calendar, toggle no-sugar
  function initSaf(){
    const key = 'saf_calendar';
    const stateRaw = localStorage.getItem(key);
    let state = stateRaw ? JSON.parse(stateRaw) : {};

    const container = document.getElementById('safCalendar');
    if(!container) return;

    // render current month
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);
    container.innerHTML = '';

    // weekday headers
    const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    weekdays.forEach(w=>{
      const h = document.createElement('div'); h.className='day header weekday'; h.style.fontWeight='700'; h.style.background='transparent'; h.style.cursor='default'; h.textContent = w;
      container.appendChild(h);
    });

    const pad = (first.getDay()+6)%7;
    const prevLast = new Date(year, month, 0).getDate();
    for(let i = pad-1; i>=0; i--){
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

      // state markers
      if(state[dayKey] && state[dayKey].noSugar) el.classList.add('succ');
      if(state[dayKey] && state[dayKey].hadSugar) el.classList.add('fail');

      el.addEventListener('click', ()=>{
        // toggle cycle: none -> noSugar -> hadSugar -> none
        const rec = state[dayKey] || { noSugar:false, hadSugar:false };
        if(!rec.noSugar && !rec.hadSugar){ rec.noSugar = true; }
        else if(rec.noSugar){ rec.noSugar = false; rec.hadSugar = true; }
        else { rec.noSugar = false; rec.hadSugar = false; }
        state[dayKey] = (rec.noSugar || rec.hadSugar) ? rec : undefined;
        // cleanup undefined
        if(!state[dayKey]) delete state[dayKey];
        // persist & re-render classes
        localStorage.setItem(key, JSON.stringify(state));
        // update UI quickly
        el.classList.toggle('succ', rec.noSugar);
        el.classList.toggle('fail', rec.hadSugar);
      });

      container.appendChild(el);
    }

    // trailing cells
    const totalCells = container.children.length;
    const rem = (7 - (totalCells % 7)) % 7;
    for(let i=0;i<rem;i++){ const el = document.createElement('div'); el.className='day other-month'; container.appendChild(el); }

    // reset button
    const resetBtn = document.getElementById('safReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      if(confirm('Bu ayın tüm işaretlerini silmek istiyor musun?')){
        // remove keys of current month
        for(let d=1; d<=last.getDate(); d++){
          const keyd = new Date(year, month, d).toISOString().slice(0,10);
          if(state[keyd]) delete state[keyd];
        }
        localStorage.setItem(key, JSON.stringify(state));
        // refresh page
        location.reload();
      }
    });
  }

  // IZINLI page: allowances with simple per-period counters
  function initIzinli(){
    const storageKey = 'izinli_state_v1';
    let stored = localStorage.getItem(storageKey);
    let st = stored ? JSON.parse(stored) : null;

    // default allowances
    const defaults = {
      dondurma: { name:'Dondurma', limit:3, period_days:7, used:0, period_start: new Date().toISOString().slice(0,10) },
      cikolata: { name:'Çikolata', limit:1, period_days:7, used:0, period_start: new Date().toISOString().slice(0,10) },
      cips: { name:'Cips', limit:1, period_days:14, used:0, period_start: new Date().toISOString().slice(0,10) }
    };
    if(!st){ st = { allowances: defaults, history: [] }; localStorage.setItem(storageKey, JSON.stringify(st)); }

    // reset per-period if expired
    const now = new Date(); Object.values(st.allowances).forEach(a=>{
      const start = new Date(a.period_start); start.setHours(0,0,0,0); now.setHours(0,0,0,0);
      const diff = Math.floor((now - start)/(1000*60*60*24));
      if(diff >= a.period_days){ a.used = 0; a.period_start = now.toISOString().slice(0,10); }
    });

    function save(){ localStorage.setItem(storageKey, JSON.stringify(st)); render(); }

    const container = document.getElementById('allowancesList');
    if(!container) return;

    function render(){
      container.innerHTML = '';
      Object.keys(st.allowances).forEach(k=>{
        const a = st.allowances[k];
        const item = document.createElement('div'); item.className='allowance-item';
        const left = document.createElement('div'); left.innerHTML = `<strong>${a.name}</strong><br><small>${a.used}/${a.limit} kullanıldı (periyot: ${a.period_days}g)</small>`;
        const right = document.createElement('div');
        const btn = document.createElement('button'); btn.className='pill'; btn.textContent = (a.used < a.limit) ? 'Kaydet' : 'Dolu';
        btn.disabled = (a.used >= a.limit);
        btn.addEventListener('click', ()=>{
          if(a.used < a.limit){
            a.used += 1;
            st.history.unshift({ date: isoToday(), type: a.name });
            if(st.history.length > 50) st.history.pop();
            save();
          }
        });
        right.appendChild(btn);
        item.appendChild(left); item.appendChild(right);
        container.appendChild(item);
      });
    }

    render();

    // reset button
    const resetBtn = document.getElementById('izinliReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      if(confirm('Tüm periyotları sıfırlamak istiyor musun?')){
        Object.values(st.allowances).forEach(a => { a.used = 0; a.period_start = isoToday(); });
        save();
      }
    });
  }

  // bootstrap per page
  document.addEventListener('DOMContentLoaded', ()=>{
    initCommon();
    if(page === 'index') initIndex();
    if(page === 'saf') initSaf();
    if(page === 'izinli') initIzinli();
  });
})();
