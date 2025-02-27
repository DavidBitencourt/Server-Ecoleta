import { Request, Response } from "express";
import knex from "../database/connection";

class PointsControllers {
  async index(request: Request, response: Response) {
    const { city, uf, items } = request.query;

    const parsedItems = await String(items)
      .split(",")
      .map((item) => {
        return Number(item.trim());
      });

    const points = await knex("points")
      .join("point_items", "points.id", "=", "point_items.point_id")
      .whereIn("point_items.item_id", parsedItems)
      .where("city", String(city))
      .where("uf", String(uf))
      .distinct()
      .select("points.*");

    const serializedPoints = await points.map((point) => {
      return {
        ...points,
        image_url: `https://dvd-server-ecoleta.herokuapp.com/uploads/${point.image}`,
      };
    });
    return response.json({ serializedPoints });
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;

    const point = await knex("points").where("id", id).first();

    if (!point) {
      return response.status(400).json({ message: "Point not found." });
    }

    const serializedPoint = {
      ...point,
      image_url: `https://dvd-server-ecoleta.herokuapp.com/uploads/${point.image}`,
    };

    const items = await knex("items")
      .join("point_items", "items.id", "=", "point_items.item_id")
      .where("point_items.point_id", id)
      .select("items.title");

    return response.json({ point: serializedPoint, items });
  }

  async create(request: Request, response: Response) {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items,
    } = request.body;

    const trx = await knex.transaction();

    const point = {
      image: request.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
    };

    const ids = await trx("points").insert(point);

    const pointItems = await items
      .split(",")
      .map((item: string) => Number(item.trim()))
      .map((item_id: number) => {
        return {
          item_id,
          point_id: ids[0],
        };
      });

    await trx("point_items").insert(pointItems);

    await trx.commit();

    return response.json({
      id: ids[0],
      ...point,
    });
  }
}

export default PointsControllers;
