// const editor = kell('editor', document.getElementById('editor_container'));

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

function print_out () {
  let print_window = window.open('','','width=800,height=600');
  print_window.document.title = 'Print';
  let style = document.createElement('style');
  style.textContent = print_style;
  print_window.document.head.appendChild(style);
  let p = document.createElement('p');
  p.textContent = 'omedetou';
  print_window.document.body.appendChild(p);
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
  print_out();
}