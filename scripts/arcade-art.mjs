// Orthographic voxel faces sampled at terminal-cell centers. The same scene
// supplies the attract frame and the completed build, without game assets.
const surfaces = {
  grass: [["#abd885", "x%*"], ["#b29468", "O+*"], ["#8d7056", "o%#"]],
  leaves: [["#b8de89", "%#@"], ["#78b47c", "8@%"], ["#528875", "OM8"]],
  bark: [["#cda678", "#%"], ["#b28d60", "|H"], ["#896949", "|I"]],
  stone: [["#d4dbd4", "#%"], ["#b0b9bd", "8M"], ["#83949f", "OM"]],
};
const gridWidth = 61;
const gridHeight = 25;

export function terrainRows(placed) {
  const cells = Array.from({length: gridHeight}, () => Array(gridWidth));
  const blocks = [];
  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 4; y++) {
      if ((x === 0 && y === 3) || (x === 5 && y === 0)) continue;
      blocks.push([x,y,0,"grass"]);
    }
  }
  blocks.push([1,1,1,"bark"],[1,1,2,"bark"]);
  for (const [x,y,z] of [[0,1,3],[1,0,3],[1,1,3],[1,2,3],[2,1,3],[1,1,4]]) {
    blocks.push([x,y,z,"leaves"]);
  }
  if (placed) blocks.push([4,2,1,"stone"]);
  const project = ([x,y,z]) => [24 + 5*(x-y), 13 + 1.2*(x+y) - 2.8*z];
  // Half-open parallelograms share their boundaries and paint without seams.
  function face(origin, endU, endV, [color, ramp]) {
    const [ox,oy] = project(origin);
    const [ux,uy] = project(endU);
    const [vx,vy] = project(endV);
    const ax=ux-ox, ay=uy-oy, bx=vx-ox, by=vy-oy;
    const det = ax*by - ay*bx;
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const dx=col+.5-ox, dy=row+.5-oy;
        const u=(dx*by-dy*bx)/det, v=(ax*dy-ay*dx)/det;
        if (u>=0 && u<1 && v>=0 && v<1) {
          const index = (col*17 + row*7 + (col^row)) % ramp.length;
          cells[row][col] = { text:ramp[index], color };
        }
      }
    }
  }
  blocks.sort((a,b) => (a[0]+a[1]+a[2]) - (b[0]+b[1]+b[2]));
  for (const [x,y,z,kind] of blocks) {
    const [top,left,right] = surfaces[kind];
    face([x,y,z+1],[x+1,y,z+1],[x,y+1,z+1],top);
    face([x,y+1,z],[x+1,y+1,z],[x,y+1,z+1],left);
    face([x+1,y,z],[x+1,y+1,z],[x+1,y,z+1],right);
  }
  if (!placed) cells[17][34] = { text:"+", color:"#e3cf65" };
  return cells.map(row => {
    const runs = [];
    let end = row.length - 1;
    while (end >= 0 && !row[end]) end--;
    for (let col=0; col<=end; col++) {
      const cell = row[col];
      const color = cell?.color ?? runs.at(-1)?.color ?? "#76c5a4";
      const text = cell?.text ?? " ";
      if (runs.at(-1)?.color === color) runs.at(-1).text += text;
      else runs.push({ text, color });
    }
    return runs;
  });
}

export function revealShards(x, y) {
  const points = Array.from({length: 5}, (_,row) =>
    Array.from({length: 8}, (_,col) => [
      x + col*80 + ((row*7 + col*13)%27), y + row*64 + ((col*9 + row*5)%23),
    ]));
  const faces = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const [a,b] = points[row].slice(col,col+2);
      const [c,d] = points[row+1].slice(col,col+2);
      for (const vertices of [[a,b,c],[b,d,c]]) {
        const delay = 24*(col+row) + (faces.length%3)*17;
        faces.push(`<polygon class="shard" points="${vertices.join(" ")}" style="animation-delay:${delay}ms"/>`);
      }
    }
  }
  return `<g aria-hidden="true">${faces.join("")}</g>`;
}
