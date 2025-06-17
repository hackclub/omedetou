const editor = kell('editor', document.getElementById('editor_container'));

let csv_name;
let csv_data;
let csv_row;

let svg_names = [];
let svg_raws = [];
let svg_srcs = [];

async function get_text (url) {
  const response = await fetch(url, { cache: 'no-cache' });
  let text;
  if (response.ok) {
    text = await response.text();
  }
  return text;
}

let print_style;
get_text('./print_style.css').then(text => {
  print_style = text;
})

let max_fonts = 2;
let font = 1;

let mod = [];
let recolor = [];
let active = undefined;
let all = [];

const rules = {
  align: i => (a, mi = i) => {
    // TODO: force single
    switch (mi) {
      case 'left':
      case 'center':
      case 'right':
        a.classList.add(mi);
        break;
      default:
        throw new Error(`invalid align "${mi}"`);
    }
  },
  as: i => (a, mi = i) => {
    // TODO: force single
    switch (mi) {
      case 'small':
        a.classList.add(mi);
        break;
      default:
        throw new Error(`invalid class "${mi}"`);
    }
  },
  say: i => {
    active = document.createElement('p');
    active.textContent = i
      .replaceAll(/{(.+?)}/g, (match, group) => {
        if (csv_row === undefined) {
          throw new Error('no csv');
        }
        if (csv_row[group] === undefined) {
          throw new Error(`no column "${group}" in csv`);
        }
        return csv_row[group];
      });
    return active;
  },
  svg: i => {
    active = document.createElement('img');
    active.onload = function () {
      console.log(`loaded ${svg_names[Number(index)]}`);
    }
    let index = i.split(' ')[0];
    let rf = i.split(' ')[1] || '';
    let rt = i.split(' ').slice(2).join(' ') || '';
    rt = rt.replaceAll(/{(.+?)}/g, (match, group) => {
      if (csv_row === undefined) {
        throw new Error('no csv');
      }
      if (csv_row[group] === undefined) {
        throw new Error(`no column "${group}" in csv`);
      }
      return csv_row[group];
    });
    if (svg_raws.length === 0) {
      throw new Error("no svg's");
    }
    if (svg_raws[Number(index)] === undefined) {
      throw new Error(`invalid svg index "${index}"`);
    }
    let raw = svg_raws[Number(index)];
    if (rf !== '' && rt === '') {
      throw new Error(`incomplete replacement`);
    }
    if (rf !== '' && !rf.match(/^[0-9a-fA-F]{6}$/)) {
      throw new Error(`invalid color "${rf}"`);
    }
    if (rt !== '' && !rt.match(/^[0-9a-fA-F]{6}$/)) {
      throw new Error(`invalid color "${rt}"`);
    }
    if (rf !== '' && rt !== '') {
      raw = raw.replaceAll(rf, rt);
    }
    const blob = new Blob([raw], { type: 'image/svg+xml' });
    const dataURL = URL.createObjectURL(blob);
    const imageLoadPromise = new Promise((resolve, reject) => {
      active.onerror = function () {
        throw new Error('promise failed (hit "print" again?)');
      }
      active.onload = function () {
        resolve();
      }
      active.src = dataURL;
    });
    active._imageLoadPromise = imageLoadPromise;
    return active;
  },
  width: i => (a, mi = i) => {
    if (Number.isNaN(Number(mi))) {
      throw new Error(`${mi} is not a number`);
    }
    if (Number(mi) % 1 !== 0) {
      throw new Error(`${mi} is not whole`);
    }
    a.style.width = mi + 'px';
    a.style.height = 'auto';
  },
}

function compile (s) {
  mod = [];
  // recolor = [];
  active = undefined;
  all = [];
  document.getElementById('error').textContent = '';
  if (s === '') {
    throw new Error('there is nothing to do');
  }
  const lines = s.split('\n');
  for (const line of lines) {
    if (line === '') {
      continue;
    }
    const rule = line.split(' ')[0];
    const i = line.split(' ').slice(1).join(' ');
    const rule_function = rules[rule];
    if (rule_function === undefined) {
      throw new Error(`no rule "${rule}"`);
    }
    let result;
    try {
      result = rule_function(i);
    } catch (e) {
      throw e;
    }
    if (result.constructor.name === 'Function') {
      mod.push(result);
    } else {
      // mod.forEach(F => {
      //   F(result);
      // });
      for (const F of mod) {
        F(result);
      }
      mod = [];
      recolor = [];
      all.push(result);
    }
  }
}

function read_csv (s) {
  const intermediate = CSV.parse(s);
  let columns = intermediate.shift();
  const result = intermediate.map((row, i) => {
    let obj = {};
    for (let c = 0; c < columns.length; c++) {
      const column = columns[c];
      obj[column] = row[c];
    }
    return obj;
  });
  return result;
}

function print_out (content) {
  let multi_all = [];
  // TODO: DRY
  // single note
  if (csv_data === undefined) {
    try {
      compile(content); // populates `all`
    } catch (e) {
      document.getElementById('error').textContent = `error: ${e.message}`;
      return;
    }
    const div = document.createElement('div');
    div.classList.add(`font-${font}`);
    for (const element of all) {
      div.appendChild(element);
    }
    multi_all.push(div);
  }
  // multiple notes
  else {
    for (let r = 0; r < csv_data.length; r++) {
      csv_row = csv_data[r];
      // TODO: inefficient?
      try {
        compile(content); // populates `all`
      } catch (e) {
        document.getElementById('error').textContent = `error: ${e.message}`;
        return;
      }
      const div = document.createElement('div');
      div.classList.add(`font-${font}`);
      if (r > 0) {
        div.classList.add('page_break');
      }
      for (const element of all) {
        div.appendChild(element);
      }
      multi_all.push(div);
    }
  }

  // Collect all image load promises from canvas elements
  const imageLoadPromises = [];
  for (const element of multi_all) {
    const canvases = element.querySelectorAll('canvas');
    for (const canvas of canvases) {
      if (canvas._imageLoadPromise) {
        imageLoadPromises.push(canvas._imageLoadPromise);
      }
    }
  }

  // Wait for all images to load before opening the print window
  Promise.all(imageLoadPromises).then(() => {
    let print_window = window.open('','','width=800,height=600');
    print_window.document.title = 'Print';

    // FIXME: this is Cursor's doing
    const fontPromise = new Promise((resolve) => {
      let googleapis = document.createElement('link');
      googleapis.setAttribute('rel', 'preconnect');
      googleapis.setAttribute('href', 'https://fonts.googleapis.com');
      print_window.document.head.appendChild(googleapis);

      let gstatic = document.createElement('link');
      gstatic.setAttribute('rel', 'preconnect');
      gstatic.setAttribute('href', 'https://fonts.gstatic.com');
      gstatic.setAttribute('crossorigin', '');
      print_window.document.head.appendChild(gstatic);

      let fonts = document.createElement('link');
      fonts.setAttribute('rel', 'stylesheet');
      fonts.setAttribute('href', 'https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,400;0,700;1,400;1,700&display=swap');
      fonts.onload = () => {
        // Wait for the font to be fully loaded and ready
        print_window.document.fonts.ready.then(() => {
          // Force a repaint to ensure the font is applied
          print_window.document.body.style.display = 'none';
          print_window.document.body.offsetHeight; // Force reflow
          print_window.document.body.style.display = '';
          resolve();
        });
      };
      print_window.document.head.appendChild(fonts);
    });

    let style = document.createElement('style');
    style.textContent = print_style;
    print_window.document.head.appendChild(style);

    for (const element of multi_all) {
      print_window.document.body.appendChild(element);
    }

    // Wait for fonts to load before printing
    fontPromise.then(() => {
      print_window.print();
      print_window.close();
    });
  });
}

document.querySelector('.kell-content').addEventListener('input', function () {
  localStorage.setItem('content', editor.content);
});

document.getElementById('csv_file_input').addEventListener('change', e => {
  const reader = new FileReader();
  reader.onload = function (e2) {
    csv_name = e.target.files[0].name;
    csv_data = read_csv(e2.target.result);
    // ui
    document.getElementById('csv').textContent = `csv: ${csv_name}`;
  }
  reader.readAsText(e.target.files[0]);
}, false);

document.getElementById('svg_file_input').addEventListener('change', e => {
  svg_names = [];
  svg_srcs = [];
  // FIXME: this is also Cursor's doing
  const files = e.target.files;
  const fileCount = files.length;
  let filesLoaded = 0;

  for (let i = 0; i < fileCount; i++) {
    const reader = new FileReader();
    reader.onload = function (e2) {
      // Get the text content
      // let svgText = e2.target.result;
      svg_names.push(files[i].name);
      svg_raws.push(e2.target.result);

      // // Perform string replacement
      // svgText = svgText.replaceAll('c7e916', '8c27eb');

      // // Convert to data URL
      // const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      // const dataURL = URL.createObjectURL(svgBlob);

      // svg_srcs.push(dataURL);

      filesLoaded++;

      if (filesLoaded === fileCount) {
        document.getElementById('svgs').textContent = `svgs: ${svg_names.map((x, i) => `${x} (${i})`).join(', ')}`;
      }
    }
    // Read as text instead of data URL
    reader.readAsText(files[i]);
  }
}, false);

document.getElementById('upload_csv').onclick = function () {
  document.getElementById('csv_file_input').click();
}

document.getElementById('upload_svgs').onclick = function () {
  document.getElementById('svg_file_input').click();
}

document.getElementById('font').onclick = function () {
  if (font === max_fonts) {
    font = 1;
  } else {
    font += 1;
  }
  document.getElementById('font').textContent = `font ${font}`;
}

document.getElementById('print').onclick = function () {
  print_out(editor.content);
}

if (localStorage.getItem('content') !== null) {
  editor.content = localStorage.getItem('content');
}