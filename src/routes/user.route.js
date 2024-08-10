import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshingRToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser
);

upload.single()

router.route("/login").post(loginUser);

// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refreshingToken").post(refreshingRToken)
router.route("/changepassword").post(verifyJWT, changeCurrentPassword)
router.route("/getuser").get(verifyJWT, getCurrentUser)
router.route("/updateaccountdetails").post(verifyJWT, updateAccountDetails)
router.route("/updateavatar").post(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/updatecoverimage").post(verifyJWT, upload.single("coverImage"), updateCoverImage)

export default router;