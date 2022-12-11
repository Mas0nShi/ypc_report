
export default class Utility {
    public static getYesterdaysDate(days = 1): string {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    public static getTimeStamp(): number {
        return new Date().getTime();
    }

    public static getUUID(): string {
        // 32 digits, no '-'.
        return 'x'.repeat(32).replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
    }
}

