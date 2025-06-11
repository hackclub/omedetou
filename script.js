// const editor = kell('editor', document.getElementById('editor_container'));

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

document.getElementById('print').onclick = function () {
  print_out();
}