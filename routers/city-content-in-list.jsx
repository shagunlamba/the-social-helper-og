import React from 'react';


const CityContentInList = (props) => ( 
  <div>
    <img src={props.record.params.imgName} alt="logo img" height= "150px" width= "200px"/> {console.log("The props are",props.record.params.imgName)}
  </div>
)

export default CityContentInList;