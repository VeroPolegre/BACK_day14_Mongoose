const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

const PostController = {
	async create(req, res, next) {
		try {
			const images = req.files.map((file) => file.filename);
			const keywords = req.body.keywords.split(", ");
			const post = await Post.create({
				...req.body,
				userId: req.user._id,
				images,
				keywords,
			});
			await User.findByIdAndUpdate(
				req.user._id,
				{
					$push: {
						postIds: post._id,
					},
				},
				{ new: true }
			);

			res.status(201).send(post);
		} catch (error) {
			console.error(error);
			next(error);
		}
	},

	async update(req, res) {
		try {
			const post = await Post.findByIdAndUpdate(req.params._id, req.body, {
				new: true,
			});
			res.send({ message: "Post updated successfully!", post });
		} catch (error) {
			console.error(error);
		}
	},

	async delete(req, res) {
		try {
			await Post.findByIdAndDelete(req.params._id);
			await Comment.deleteMany({ postId: req.params._id });
			res.send({ message: "Post deleted successfully" });
		} catch (error) {
			console.error(error);
			res.status(500).send({ message: "Error trying to remove the post" });
		}
	},

	async getAll(req, res, next) {
		try {
			let { page, limit } = req.query;

			limit = parseInt(limit, 10) || 3;

			const posts = await Post.find({})
				.populate({ path: "userId", select: "username avatar" })
				.populate({
					path: "commentIds",
					populate: {
						path: "userId",
						select: "username",
					},
				})
				.limit(limit)
				.skip((page - 1) * limit);

			const totalPostsCount = await Post.countDocuments();

			const hasMorePages = totalPostsCount > page * limit;

			res.status(200).send({ posts, hasMorePages });
		} catch (error) {
			console.error(error);
			next(error);
		}
	},

	async getById(req, res) {
		try {
			const post = await Post.findById(req.params._id);
			res.send(post);
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.send({ message: "There was a problem getting the post by id" });
		}
	},

	async getByTitle(req, res) {
		try {
			if (req.params.title.length > 20) {
				return res.status(400).send("Search too long");
			}
			const title = new RegExp(req.params.title, "i");
			const posts = await Post.find({ title });
			res.send(posts);
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.send({ message: "There was a problem getting the post by title" });
		}
	},

	async getByKeywords(req, res) {
		try {
			const { keywords } = req.query;
			if (!keywords) {
				return res
					.status(400)
					.send({ message: "Please provide keywords for the search." });
			}
			const posts = await Post.find({
				keywords: {
					$in: keywords.split(","),
				},
			});
			res.send(posts);
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.send({ message: "There was a problem getting posts with keywords" });
		}
	},

	async like(req, res) {
		try {
			const loggedUser = await User.findById(req.user._id);
			let postToLike = await Post.findById(req.params._id);

			if (!postToLike)
				return res.status(400).send({ message: "Post not found" });

			if (postToLike.likes.includes(req.user._id)) {
				return res.status(400).send({
					message: `You already liked ${postToLike.userId}, post ${loggedUser.username}`,
				});
			} else {
				postToLike = await Post.findByIdAndUpdate(
					req.params._id,
					{
						$push: {
							likes: req.user._id,
						},
					},
					{ new: true }
				);
				await User.findByIdAndUpdate(
					req.user._id,
					{
						$push: {
							likesList: req.params._id,
						},
					},
					{ new: true }
				);
				res.send(postToLike);
			}
		} catch (error) {
			console.error(error);
			res.status(500).send({ message: "There was a problem liking the post" });
		}
	},

	async unlike(req, res) {
		try {
			let postToUnlike = await Post.findById(req.params._id);
			if (!postToUnlike)
				return res.status(400).send({ message: "Post not found" });

			postToUnlike = await Post.findByIdAndUpdate(
				req.params._id,
				{
					$pull: {
						likes: req.user._id,
					},
				},
				{ new: true }
			);
			await User.findByIdAndUpdate(
				req.user._id,
				{
					$pull: {
						likesList: req.params._id,
					},
				},
				{ new: true }
			);
			res.send(postToUnlike);
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.send({ message: "There was a problem unliking the post" });
		}
	},
};

module.exports = PostController;
