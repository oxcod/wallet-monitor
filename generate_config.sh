#!/bin/bash

# Generate wallet configuration for the monitor page
echo "Generating wallet monitor configuration..."

# Remove old configuration file if exists
rm -f wallet_config.js

# Create JavaScript configuration file
cat > wallet_config.js << 'EOF'
// Auto-generated wallet configuration
const WALLET_CONFIG = [
EOF

# Extract address and port from each txt file in parent directory
for file in "../The browser wallet URL of account "*.txt; do
    if [ -f "$file" ]; then
        # Extract address from filename
        filename=$(basename "$file")
        address=${filename#"The browser wallet URL of account "}
        address=${address%.txt}
        
        # Read the URL from the file (handle potential whitespace/newlines)
        url=$(cat "$file" | tr -d '\r\n' | grep -o 'http://[^[:space:]]*')
        
        if [ ! -z "$url" ]; then
            # Extract port from URL
            port=$(echo "$url" | sed 's/.*://')
            
            echo "Found: $address -> $url (port: $port)"
            
            # Add to config file
            cat >> wallet_config.js << EOF
    {
        address: "$address",
        url: "$url",
        port: $port
    },
EOF
        else
            echo "Warning: Could not extract URL from $file"
        fi
    fi
done

# Close the JavaScript array
cat >> wallet_config.js << 'EOF'
];

// Last generated: 
EOF

echo "// $(date)" >> wallet_config.js

echo ""
echo "Configuration generated in wallet_config.js"
echo "Open wallet_monitor_auto.html in your browser"
echo ""

# Count wallets
wallet_count=$(grep -c "address:" wallet_config.js)
echo "Total wallets configured: $wallet_count"

# Show sample of generated config
echo ""
echo "Sample configuration:"
head -20 wallet_config.js