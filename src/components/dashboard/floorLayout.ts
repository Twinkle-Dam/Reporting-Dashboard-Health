export function generateRoomLayout(rooms: any[], svgWidth = 1000, svgHeight = 600) {
  const margin = 40;
  const gap = 12;
  const corridorHeight = 100;
  const blockGap = 40;
  const columns = 6;
  const rowsPerSide = 2;
  const usableWidth = svgWidth - margin * 2;
  const usableHeight = svgHeight - margin * 2 - corridorHeight - blockGap;
  const sideHeight = Math.max(0, usableHeight / 2);
  const roomWidth = (usableWidth - gap * (columns - 1)) / columns;
  const roomHeight = (sideHeight - gap * (rowsPerSide - 1)) / rowsPerSide;

  const positioned = rooms.slice(0, 24).map((room, index) => {
    const isTop = index < 12;
    const localIndex = index % 12;
    const row = Math.floor(localIndex / columns);
    const col = localIndex % columns;
    const baseYTop = margin;
    const baseYBottom = margin + sideHeight + corridorHeight + blockGap;
    const x = margin + col * (roomWidth + gap);
    const y = (isTop ? baseYTop : baseYBottom) + row * (roomHeight + gap);
    return {
      ...room,
      x,
      y,
      width: roomWidth,
      height: roomHeight,
    };
  });

  return {
    svgWidth,
    svgHeight,
    corridor: {
      x: margin,
      y: margin + sideHeight + (blockGap - corridorHeight) / 2,
      width: usableWidth,
      height: corridorHeight,
    },
    rooms: positioned,
  };
}
