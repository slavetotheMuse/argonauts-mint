/* ═══════════════════════════════════════════════════════════════
   MINT_ENHANCE — index.html-only behaviour layer
   - Builds a live palette picker that re-skins the mint page
   - Replaces the static hero specimens with live randomizing previews
   Requires: trait_data_24.js (TRAIT_B64) and generator_embed.js
   loaded BEFORE this file.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // ─── Background trait list (mirrors generator) ───
  // Excludes hidden alien variants — viewers see all real PNGs.
  var BG_FILES = [
    'BLUSH.png','OFFWHITE.png','PUNKBLUE.png','yellow_new.png',
    'ancient.png','blackgrey.png','bubblegum.png','MuseGreen.png',
    'alien_ice_prism.png','alien_wide_violet.png'
  ];
  var BG_LABELS = {
    'BLUSH.png':'Blush','OFFWHITE.png':'Off-White','PUNKBLUE.png':'Punk Blue',
    'yellow_new.png':'Yellow','ancient.png':'Ancient','blackgrey.png':'Void',
    'bubblegum.png':'Bubblegum','MuseGreen.png':'Muse Green',
    'alien_ice_prism.png':'Ice Prism','alien_wide_violet.png':'Wide Violet'
  };

  // Default parchment + off-white fixed swatches
  var DEFAULT_PARCHMENT = { r:0xf0, g:0xe8, b:0xd8 };  // host page var --parchment
  var OFFWHITE_SWATCH   = { r:0xf5, g:0xf0, b:0xe3 };

  // ─── Helpers ───
  function rgb(c){ return 'rgb('+c.r+','+c.g+','+c.b+')'; }
  function offset(c, d){
    return {
      r: Math.max(0, Math.min(255, c.r + d)),
      g: Math.max(0, Math.min(255, c.g + d)),
      b: Math.max(0, Math.min(255, c.b + d))
    };
  }
  function luminance(c){ return (0.299*c.r + 0.587*c.g + 0.114*c.b) / 255; }

  // Average all opaque pixels of a 24x24 PNG (loaded from TRAIT_B64)
  function averagePixels(b64){
    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){
        var c = document.createElement('canvas');
        c.width = 24; c.height = 24;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 24, 24);
        var data;
        try { data = ctx.getImageData(0,0,24,24).data; }
        catch(e){ resolve(null); return; }
        var r=0,g=0,b=0,n=0;
        for (var i=0; i<data.length; i+=4){
          if (data[i+3] > 0){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; n++; }
        }
        if (!n){ resolve(null); return; }
        resolve({ r: Math.round(r/n), g: Math.round(g/n), b: Math.round(b/n) });
      };
      img.onerror = function(){ resolve(null); };
      img.src = b64;
    });
  }

  // ─── Apply / reset palette ───
  function applyPalette(c){
    var deep = offset(c, -18);
    document.documentElement.style.setProperty('--parchment', rgb(c));
    document.documentElement.style.setProperty('--parchment-deep', rgb(deep));
    document.documentElement.style.setProperty('--parchment-dark', rgb(offset(c, -10)));
    if (luminance(c) < 0.55){
      document.documentElement.style.setProperty('--ink', '#f5f0e3');
      document.documentElement.style.setProperty('--ink-faint', 'rgba(245,240,227,0.6)');
      document.body.classList.add('palette-dark');
    } else {
      document.documentElement.style.removeProperty('--ink');
      document.documentElement.style.removeProperty('--ink-faint');
      document.body.classList.remove('palette-dark');
    }
  }
  function resetPaletteDefault(){
    document.documentElement.style.removeProperty('--parchment');
    document.documentElement.style.removeProperty('--parchment-deep');
    document.documentElement.style.removeProperty('--parchment-dark');
    document.documentElement.style.removeProperty('--ink');
    document.documentElement.style.removeProperty('--ink-faint');
    document.body.classList.remove('palette-dark');
  }

  // ─── Build the palette bar ───
  function buildPaletteBar(){
    var bar = document.createElement('div');
    bar.className = 'mint-palette-bar show';
    bar.id = 'mintPaletteBar';
    document.body.appendChild(bar);

    function makeSwatch(c, label, isDefault){
      var s = document.createElement('div');
      s.className = 'mint-palette-swatch';
      s.style.background = rgb(c);
      s.title = label;
      if (isDefault) s.classList.add('active');
      s.addEventListener('click', function(){
        bar.querySelectorAll('.mint-palette-swatch').forEach(function(el){
          el.classList.remove('active');
        });
        s.classList.add('active');
        if (isDefault) resetPaletteDefault();
        else applyPalette(c);
      });
      return s;
    }

    // Two fixed ivory swatches first
    bar.appendChild(makeSwatch(DEFAULT_PARCHMENT, 'Parchment (default)', true));
    bar.appendChild(makeSwatch(OFFWHITE_SWATCH, 'Off-White', false));

    // Background trait swatches — averaged from TRAIT_B64 PNGs
    if (typeof TRAIT_B64 === 'undefined') return;
    BG_FILES.forEach(function(file){
      var key = 'background/' + file;
      var b64 = TRAIT_B64[key];
      if (!b64) return;
      averagePixels(b64).then(function(c){
        if (!c) return;
        bar.appendChild(makeSwatch(c, BG_LABELS[file] || file, false));
      });
    });
  }

  // ─── Live hero previews ───
  function activateLivePreviews(){
    var grid = document.getElementById('heroSpecimens');
    if (!grid) return;
    if (typeof window.genRandomSVG !== 'function') return;
    // Replace all child <img> with live ones
    var imgs = grid.querySelectorAll('img');
    imgs.forEach(function(img){
      img.classList.add('live');
      img.src = window.genRandomSVG();
      img.addEventListener('click', function(){
        img.src = window.genRandomSVG();
      });
    });
    // Slow refresh — one card swaps every ~2.5s (cycling)
    var idx = 0;
    setInterval(function(){
      if (!imgs.length) return;
      var el = imgs[idx % imgs.length];
      el.style.opacity = '0';
      setTimeout(function(){
        el.src = window.genRandomSVG();
        el.style.opacity = '';
      }, 220);
      idx++;
    }, 2500);
  }

  // ─── Init ───
  function init(){
    buildPaletteBar();
    // Wait one tick so generator_embed has registered window.genRandomSVG
    setTimeout(activateLivePreviews, 50);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
