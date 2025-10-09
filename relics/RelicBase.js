export class Relic {
    constructor({ id, name, description, icon = '♦', cost = 100 }) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.cost = cost;
    }

    apply(scene) {
        // To be implemented by subclasses
    }
}
