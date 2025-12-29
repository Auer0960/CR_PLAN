import * as ReactWindow from 'react-window';
console.log('ReactWindow exports:', Object.keys(ReactWindow));
try {
    console.log('FixedSizeGrid:', ReactWindow.FixedSizeGrid);
} catch (e) {
    console.log('Error accessing FixedSizeGrid:', e);
}
