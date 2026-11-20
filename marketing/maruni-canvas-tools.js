// Keep the preview controls outside the canvas so exports contain only artwork.
window.maruniCanvasTools = function (canvas, options) {
  const bar = document.createElement('div');
  bar.className = 'maruni-canvas-tools';
  bar.hidden = true;
  const label = document.createElement('label');
  label.textContent = '캐릭터 크기 ';
  const size = document.createElement('input');
  size.type = 'range';
  size.min = options.min;
  size.max = options.max;
  label.append(size);
  const trash = document.createElement('button');
  trash.type = 'button';
  trash.textContent = '이 컷에서 삭제';
  trash.title = '누르거나 캐릭터를 여기로 끌어 놓으세요';
  bar.append(label, trash);
  options.anchor.after(bar);
  trash.onclick = options.remove;
  size.oninput = () => options.resize(Number(size.value), 'input');
  size.onchange = () => options.resize(Number(size.value), 'change');

  // Native scrolling cancels a touch sequence. Only a completed tap selects.
  canvas.addEventListener('click', event => options.pick(event));
  function overTrash(event) {
    if (bar.hidden) return false;
    const box = trash.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
  }
  return {
    show(value) {
      bar.hidden = value == null;
      if (value != null) size.value = value;
    },
    remove: options.remove,
    overTrash
  };
};
