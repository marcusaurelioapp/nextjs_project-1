import { Component } from "react";
import './styles.css';

export class Button extends Component {
    render(){
        const {text, onCLick, disabled}=this.props;
        return(
            <button disabled={disabled} onClick={onCLick} className="button">
                {text}
            </button>
        );
    }
}