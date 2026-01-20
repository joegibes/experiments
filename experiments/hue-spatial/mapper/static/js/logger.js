export class Logger {
    static async log(level, message, data = null) {
        const entry = {
            level: level,
            message: message,
            timestamp: Date.now() / 1000,
            data: data
        };

        console.log(`[${level}] ${message}`, data || '');

        try {
            await fetch('/api/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entry)
            });
        } catch (e) {
            console.error("Failed to send log to server", e);
        }
    }

    static info(message, data) { this.log('INFO', message, data); }
    static warn(message, data) { this.log('WARN', message, data); }
    static error(message, data) { this.log('ERROR', message, data); }
    static debug(message, data) { this.log('DEBUG', message, data); }
}
