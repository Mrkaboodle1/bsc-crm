'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// The little bit of code that goes on the BigStar website so visits show up here.
export function TrackingSnippet({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false)
  const code = `<!-- BigStar Circus visitor tracking -->
<script>
(function(){
  try {
    var K='bsc_vid', id=localStorage.getItem(K);
    if(!id){ id=Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem(K,id); }
    var q=new URLSearchParams(location.search);
    function send(extra){
      fetch('${endpoint}',{
        method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true,
        body:JSON.stringify(Object.assign({
          visitor_id:id, path:location.pathname, referrer:document.referrer,
          utm_source:q.get('utm_source'), utm_campaign:q.get('utm_campaign')
        }, extra||{}))
      }).catch(function(){});
    }
    send();
    // Also record what people type into a site search box (name="s" or "search" or .bsc-search)
    document.addEventListener('submit', function(e){
      var f=e.target; if(!f || !f.querySelector) return;
      var i=f.querySelector('input[name="s"],input[name="search"],input[type="search"],.bsc-search');
      if(i && i.value) send({ search_term: i.value.slice(0,200) });
    }, true);
  } catch(e){}
})();
</script>`

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <h3 className="font-black text-zinc-900">📋 Add this to your website</h3>
          <p className="text-sm text-zinc-500 mt-0.5 max-w-xl">
            Paste it once, just before the closing <code className="bg-zinc-100 px-1 rounded">&lt;/body&gt;</code> tag on bigstarcircus.com.au
            (in WordPress: Appearance → Theme File Editor, or a “header/footer scripts” plugin). Every page view then shows up above.
          </p>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }}
          className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-3.5 py-2 rounded-lg shrink-0"
        >
          {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy code</>}
        </button>
      </div>
      <pre className="bg-zinc-950 text-zinc-100 rounded-xl p-4 text-[11.5px] leading-relaxed overflow-x-auto"><code>{code}</code></pre>
      <p className="text-xs text-zinc-400 mt-2">
        No names, no emails, no third-party cookies — just an anonymous id so repeat visits aren&apos;t double-counted.
      </p>
    </div>
  )
}
