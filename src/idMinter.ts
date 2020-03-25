export function IdMinter() {
    return Math.random().toString(36).substring(7);
}