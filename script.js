const editor = kell('editor', document.getElementById('editor_container'));

let csv_name;
let csv_data;
let csv_row;

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

let active = undefined;
let all = [];

const rules = {
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
}

function compile (s) {
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
    all.push(result);
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

  print_window.document.close();
  print_window.focus();

  // Wait for fonts to load before printing
  fontPromise.then(() => {
    print_window.print();
    print_window.close();
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

document.getElementById('upload_csv').onclick = function () {
  document.getElementById('csv_file_input').click();
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