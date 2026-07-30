const FILES = { hello:'hello', phone119:'phone-119', map:'map', book:'book', cpr:'cpr' };

export default function Mascot({ variant = 'hello', className = '', alt = 'CPR 小心臟' }) {
  const file = FILES[variant] || FILES.hello;
  return <img src={`/mascot/${file}.png`} alt={alt} className={className} draggable="false" />;
}