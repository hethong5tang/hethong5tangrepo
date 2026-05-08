
import React from 'react';

const formatValue = (value: number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    // Use vi-VN to get dot as thousands separator and comma as decimal separator
    return value.toLocaleString('vi-VN', { maximumFractionDigits: 10 });
};

const parseValue = (value: string): number => {
    // In vi-VN, '.' is thousands and ',' is decimal. 
    // To parse correctly, remove '.' and replace ',' with '.'
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    // Keep only numbers, one dot, and minus sign
    const regex = /^-?\d*\.?\d*$/;
    const match = cleanValue.match(/-?\d*\.?\d*/);
    const result = match ? match[0] : '';
    return parseFloat(result) || 0;
};

interface FormattedNumberInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
    value,
    onChange,
    placeholder = "0",
    className,
}) => {
    const [inputValue, setInputValue] = React.useState<string>(formatValue(value));

    // Update internal state when prop changes, but only if not currently focused to avoid jumpy cursor
    React.useEffect(() => {
        setInputValue(formatValue(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        // Allow typing (digits, one comma, one dot, or minus at start)
        // We'll let the user type and only parse/format on blur or controlled change
        setInputValue(raw);
        
        const parsed = parseValue(raw);
        if (!isNaN(parsed)) {
            onChange(parsed);
        }
    };

    const handleBlur = () => {
        setInputValue(formatValue(value));
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={className}
        />
    );
};

export default FormattedNumberInput;
