const CardHead = ({ title, meta }) => (
  <div className="card-head">
    <span>{title}</span>
    {meta ? <small>{meta}</small> : null}
  </div>
);

export default CardHead;
