const editor = kell('editor', document.getElementById('editor_container'));

let csv_name;
let csv_data;

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

let active = undefined;
let all = [];

const rules = {
  say: i => {
    active = document.createElement('p');
    active.textContent = i;
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
    const result = rule_function(i);
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
  try {
    compile(content); // populates `all`
  } catch (e) {
    document.getElementById('error').textContent = `error: ${e.message}`;
    return;
  }
  let print_window = window.open('','','width=800,height=600');
  print_window.document.title = 'Print';
  let style = document.createElement('style');
  style.textContent = print_style;
  print_window.document.head.appendChild(style);
  for (const element of all) {
    print_window.document.body.appendChild(element);
  }
  print_window.document.close();
  print_window.focus();
  print_window.print();
  print_window.close();
}

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

document.getElementById('print').onclick = function () {
  print_out(editor.content);
}